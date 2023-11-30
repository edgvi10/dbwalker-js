// import mysql from 'serverless-mysql';
const mysql = require('serverless-mysql');
const { format } = require('sql-formatter');
const QueryBuilder = require('../querybuilder.js');
require('dotenv').config();

class DBWalker extends QueryBuilder {
    #db;
    constructor(connect_params) {
        super();
        if (connect_params) { // from params
            var params = {};

            if (typeof connect_params === "string") {
                params = this.getConnectionFromString(connect_params);
            } else if (typeof connect_params === "object") {
                if (connect_params.host) [params.host, params.port] = connect_params.host.split(":");
                if (connect_params.port) params.port = parseInt(connect_params.port);
                if (connect_params.user) params.user = connect_params.user;
                if (connect_params.pass || connect_params.password) params.password = connect_params.pass ? connect_params.pass : connect_params.password;
                if (connect_params.base || connect_params.database) params.database = connect_params.base ? connect_params.base : connect_params.database;
            } else if (typeof connect_params === "array") {
                // check if second param is port or user
                params.host = connect_params[0];
                if (typeof connect_params[1] === "number") {
                    params.port = connect_params[1];
                    params.user = connect_params[2];
                    params.password = connect_params[3];
                    params.database = connect_params[4];
                } else {
                    params.user = connect_params[1];
                    params.password = connect_params[2];
                    params.database = connect_params[3];
                }
            }

            if (!params.port) params.port = 3306;

            if (!params.timezone) params.timezone = connect_params.timezone ? connect_params.timezone : "-00:00";
            params.typeCast = connect_params.typecast ? connect_params.typecast : true;

            this.timezone = params.timezone;

            this.#db = mysql({ config: params });
        } else {
            // from .env
            if (process.env.DBWALKER_STRING)
                this.#db = mysql({ config: this.getConnectionFromString(process.env.DBWALKER_STRING) });
            else {
                const required = ["DBWALKER_HOST", "DBWALKER_USER", "DBWALKER_PASS", "DBWALKER_BASE"];
                for (const param of required)
                    if (!process.env[param]) throw new Error(`Missing ${param} environment variable`);

                this.#db = mysql({
                    config: {
                        host: process.env.DBWALKER_HOST,
                        port: process.env.DBWALKER_PORT ? process.env.DBWALKER_PORT : 3306,
                        user: process.env.DBWALKER_USER,
                        password: process.env.DBWALKER_PASS,
                        database: process.env.DBWALKER_BASE,
                    }
                });
            }
        }

        return this;
    }

    getConnectionFromString(str) {
        const params = {};

        const [driver, data] = str.split("://");

        if (driver !== "mysql") throw new Error("Invalid driver");

        const [host_data, ...user_data_array] = data.split("@").reverse();
        const [host, database] = host_data.split("/");
        if (!database) throw new Error("Missing database");
        const [hostname, port] = host.split(":");

        const user_data = user_data_array.reverse().join("@");

        const [username, ...password_array] = user_data.split(":");
        const password = password_array.join(":");

        const [database_name, ...connect_params] = database.split("?");

        params.host = hostname;
        params.port = port ? parseInt(port) : 3306;
        params.user = username;
        params.password = password;
        params.database = database_name;

        if (connect_params.length > 0) for (const param of connect_params) {
            const [key, value] = param.split("=");
            params[key] = value;
        }

        return params;
    }

    async query(sql, values) {
        try {
            if (!sql) sql = this.sql;
            if (!sql) throw new Error("SQL is empty");

            if (!values) values = this.values;

            const sql_result = await this.#db.query(sql, values);
            if (Array.isArray(sql_result)) {
                const rows = [];
                for (const row of Object.values(sql_result)) {
                    rows.push({ ...row });
                }

                return rows;
            } else {
                return { ...sql_result };
            }
        } catch (error) {
            const result = {};
            if (!error.code && error.message && error.message.toString().indexOf("ER_ACCESS_DENIED_ERROR") > -1) {
                error.code = "ACCESS DENIED";
                error.message = error.message.split("ER_ACCESS_DENIED_ERROR: ")[1].trim();
            }

            if (error.code) result.code = error.code;
            result.message = error.sqlMessage ? error.sqlMessage : error.message;
            result.sql = sql;
            result.values = values;

            throw result;
        }
    }

    async run() {
        const result = {};
        try {
            const data = await this.query(this.sql, this.values);
            result.success = true;
            if (data.insertId) result.insert_id = data.insertId;
            if (data.affectedRows) result.affected_rows = data.affectedRows;

            if (!data.insertId && !data.affectedRows) {
                result.rows = Object.values(data).length;
                result.data = Object.values(data).map(row => {
                    return { ...row }
                });
            }
        } catch (error) {
            result.success = false;
            throw result;
        }

        return result;
    }

    async kill(id) {
        try {
            await this.query(`KILL CONNECTION  ${id}`);
            return true;
        } catch (error) {
            throw error;
        }
    }

    async showProcessList() {
        try {
            const result = await this.query("SELECT ID, HOST, USER, DB, TIME FROM information_schema.processlist");
            return result;
        } catch (error) {
            throw error;
        }
    }

    setQuery(sql) {
        this.sql = sql;
        return this;
    }

    setValues(values) {
        this.values = (Array.isArray(values) || typeof values === "object") ? values : [values];
        this.values = Object.keys(this.values).map(key => this.values[key] = this.escapeString(this.values[key]));

        if (this.sql) {
            if (Array.isArray(this.values)) {
                this.sql = this.sql.replace(/\?/g, (match, offset, string) => {
                    if (values.length > 0) {
                        const value = values.shift();
                        if (typeof value === "string") return `'${value}'`;
                        else return value;
                    } else return match;
                });
            } else {
                Object.keys(this.values).map((key, index) => {
                    if (typeof this.values[key] === "string") this.values[key] = `'${this.values[key]}'`;

                    this.sql = this.sql.replace(`:${key}`, this.values[key]);
                });
            }
        }

        return this;
    }

    async connect() {
        try {
            await this.#db.connect();
            return true;
        } catch (error) {
            return error;
        }
    }

    async quit() {
        try {
            await this.#db.end();
            this.#db.quit();
            return true;
        } catch (error) {
            throw error;
        }
    }

    async close() {
        return await this.quit();
    }

    async ping() {
        try {
            await this.#db.ping();
            return true;
        } catch (error) {
            return false;
        }
    }

    toString() {
        return this.sql;
    }

    toFormat() {
        return format(this.sql, { language: "mysql", indent: "    " });
    }

    format() {
        return this.toFormat();
    }

    async getTables(table_name) {
        const query = (table_name) ? "SHOW TABLES LIKE '%" + table_name + "%'" : "SHOW TABLES";
        const select_tables = await this.query(query);
        const tables = [];
        for (const row of select_tables) {
            try {
                tables.push(Object.values(row)[0]);
            } catch (error) { }
        }

        return tables;
    }

    async describe(table_name) {
        if (!table_name) throw new Error("Table name is required");
        const raw = await this.query(`DESCRIBE ${this.tableName(table_name).fullname}`);
        const result = [];
        raw.forEach(row => {
            const field = {};
            field.name = row.Field;
            field.type = row.Type.toUpperCase();
            field.nullable = (row.Null === "YES");
            field.key = row.Key ? row.Key : null;
            if (row.Key === "PRI") field.key = "PRIMARY";
            if (row.Key === "UNI") field.key = "UNIQUE";
            if (row.Extra === "auto_increment") field.auto_increment = true;

            field.default = row.Default;
            field.extra = row.Extra;

            result.push(field);
        });

        return result;
    }

    async uuid() {
        try {
            const result = await this.query("SELECT UUID() AS uuid");
            return result[0].uuid;
        } catch (error) {
            throw new Error("UUID generation failed");
        }
    }

    async now(timezone) {
        try {
            if (timezone) await this.query(`SET time_zone='${timezone}'`);
            const result = await this.query(`SELECT CAST(NOW() AS CHAR) AS now`);
            return result[0].now;
        } catch (error) {
            throw new Error("Now generation failed:" + error.message);
        }
    }

    async md5(string) {
        try {
            const result = await this.query(`SELECT MD5('${string}') AS md5`);
            return result[0].md5;
        } catch (error) {
            throw new Error("MD5 generation failed");
        }
    }

    async sha1(string) {
        try {
            const result = await this.query(`SELECT SHA1('${string}') AS sha1`);
            return result[0].sha1;
        } catch (error) {
            throw new Error("SHA1 generation failed");
        }
    }

    // execute options
    select(params, debug = false) {
        this.debug = debug;
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildSelect(params, debug);

        return this;
    }

    insert(params, debug = false) {
        this.debug = debug;
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildInsert(params, debug);

        return this;
    }

    update(params, debug = false) {
        this.debug = debug;
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildUpdate(params, debug);

        return this;
    }

    delete(params, debug = false) {
        this.debug = debug;
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildDelete(params, debug);

        return this;
    }
}

module.exports = DBWalker;