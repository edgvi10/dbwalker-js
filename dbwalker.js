// import mysql from 'serverless-mysql';
const mysql = require('serverless-mysql');
const { format } = require('sql-formatter');
const QueryBuilder = require('./querybuilder');
require('dotenv').config();


class DBWalker extends QueryBuilder {
    constructor(connect_params) {
        if (connect_params) { // from params
            var params = {};

            if (typeof connect_params === "string") {
                params = this.getConnectionFromString(connect_params);
            } else if (typeof connect_params === "object") {
                if (connect_params.host) [params.host, params.port] = connect_params.host.split(":");
                if (connect_params.port) params.port = parseInt(connect_params.port);
                if (connect_params.user) params.user = connect_params.user;
                if (connect_params.pass) params.password = connect_params.pass;
                if (connect_params.base) params.database = connect_params.base;
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

            this.db = mysql({ config: params });
        } else { // from .env
            if (process.env.DBWALKER_STRING)
                this.db = mysql({
                    config: {
                        host: process.env.DBWALKER_HOST,
                        port: process.env.DBWALKER_PORT ?? 3306,
                        user: process.env.DBWALKER_USER,
                        password: process.env.DBWALKER_PASS,
                        database: process.env.DBWALKER_BASE,
                    }
                });
        }

        return this;
    }

    getConnectionFromString(str) {
        const params = {};
        const pattern = /mysql:\/\/([^:]+):([^@]+)@([^:]+):([0-9]+)\/([a-z0-9_]+)/;
        const match = connect_params.match(pattern);
        if (match) {
            params.host = match[3];
            params.port = match[4];
            params.user = match[1];
            params.password = match[2];
            params.database = match[5];
        } else {
            throw new Error("Invalid connection string");
            return;
        }
        return params;
    }

    async query(sql, params) {
        try {
            const result = await this.db.query(sql, params);
            await this.db.end();
            return result;
        } catch (error) {
            console.log("[DB WALKER] query() ", error.message);
            const result = {};
            if (!error.code && error.message && error.message.toString().indexOf("ER_ACCESS_DENIED_ERROR") > -1) {
                error.code = "ACCESS DENIED";
                error.message = error.message.split("ER_ACCESS_DENIED_ERROR: ")[1].trim();
            }

            if (error.code) result.code = error.code;
            result.message = error.sqlMessage || error.message;
            result.sql = sql;

            throw result;
        }
    }

    async run() {
        const result = {};
        try {
            const data = await this.db.query(this.sql, this.values);
            result.success = true;
            if (data.insertId) result.insertId = data.insertId;
            if (data.affectedRows) result.affected_rows = data.affectedRows;

            if (!data.insertId && !data.affectedRows) result.data = Object.values(data);
        } catch (error) {
            result.success = false;
            console.log("[DB WALKER] query() ", error);

            if (!error.code && error.message && error.message.toString().indexOf("ER_ACCESS_DENIED_ERROR") > -1) {
                error.code = "ACCESS DENIED";
                error.message = error.message.split("ER_ACCESS_DENIED_ERROR: ")[1].trim();
            }

            if (error.code) result.code = error.code;
            result.message = error.sqlMessage || error.message;
            result.sql = this.sql;
        }

        await this.db.end();
        return result;
    }

    async quit() {
        this.db.quit();
        return;
    }


    toString() {
        return this.sql;
    }

    format() {
        return format(this.sql);
    }

    // execute options
    select(params, debug = false) {
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildSelect(params, debug);

        return this;
    }

    insert(params, debug = false) {
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildInsert(params, debug);

        return this;
    }

    update(params, debug = false) {
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildUpdate(params, debug);

        return this;
    }

    delete(params, debug = false) {
        if (typeof params === "string") this.sql = params;
        else this.sql = this.buildDelete(params, debug);

        return this;
    }
}

module.exports = DBWalker;