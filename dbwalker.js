// import mysql from 'serverless-mysql';
const mysql = require('serverless-mysql');

class DBWalker {
    constructor(connect_params) {
        if (connect_params) {
            const params = {};
            if (connect_params.host) [params.host, params.port] = connect_params.host.split(":");
            if (connect_params.port) params.port = parseInt(connect_params.port);
            if (connect_params.user) params.user = connect_params.user;
            if (connect_params.pass) params.password = connect_params.pass;
            if (connect_params.base) params.database = connect_params.base;
            if (!params.port) params.port = 3306;

            this.db = mysql({ config: params });
        } else {
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

    async query(sql, params) {
        var result;
        try {
            result = await this.db.query(sql, params);
        } catch (error) {
            console.log(error);
            result = { code: error.code, message: error.sqlMessage, sql: error.sql };
        }

        await this.db.end();
        return result;
    }

    async run() {
        const result = {};
        try {
            const result = await this.db.query(this.sql, this.values);
            result.success = true;
            result.data = result;

        } catch (error) {
            result.success = false;
            console.log("[DB WALKER] ", error);
            result.error = { code: error.code, message: error.sqlMessage, sql: error.sql };
        }

        await this.db.end();
        return result;
    }

    async quit() {
        this.db.quit();
        return;
    }

    escapeString(str) {
        return str.toString().replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
            switch (char) {
                case "\0":
                    return "\\0";
                case "\x08":
                    return "\\b";
                case "\x09":
                    return "\\t";
                case "\x1a":
                    return "\\z";
                case "\n":
                    return "\\n";
                case "\r":
                    return "\\r";
                case "\"":
                case "'":
                case "\\":
                case "%":
                    return "\\" + char;
                default:
                    return char;
            }
        });
    }

    tableName(raw_table_name) {
        const $return = {};

        const [table_name, alias] = raw_table_name.replace(/`/g, "").split(" AS ");

        const [name, database] = table_name.split(".").reverse();

        $return.database = database;
        $return.table = name;
        $return.alias = alias;

        const table_parts = [];
        if (database) table_parts.push(database);
        if (table_name) table_parts.push(name);

        const joined_parts = `${table_parts.join("`.`")}`;
        $return.name = `\`${joined_parts}\``;
        if (alias) {
            $return.fullname = `\`${joined_parts}\` AS \`${alias}\``;
        } else {
            $return.fullname = `\`${joined_parts}\``;
        }

        return $return;
    }

    getValue(value) {
        // console.log(value, value.slice(0, 1), value.slice(-1));
        switch (typeof value) {
            case "string": value = (value.slice(0, 1) === "`" && value.slice(-1) === "`") ? value : "'" + this.escapeString(value) + "'"; break;
            case "number": value = parseFloat(value); break;
            case "null": value = "NULL"; break;
            case "boolean": value = value ? 1 : 0; break;
            default: value = "''"; break;
        }

        return value;
    }

    buildWhere(where_param) {
        const query_where_params = [];
        where_param.map(condition => {
            if (Array.isArray(condition)) {
                const where_params = [];
                condition.map(condition_item => {
                    where_params.push(condition_item);
                });
                query_where_params.push(`(${where_params.join(" OR ")})`);
            } else {
                query_where_params.push(condition);
            }
        });

        return query_where_params.length ? query_where_params.join(" AND ") : null;
    }

    buildJoin(join_param) {
        const query_join_params = [];
        join_param.map(condition => {
            if (Array.isArray(condition)) {
                const [direction, table, on] = condition;

                const join_params = [];
                join_params.push(`${direction} JOIN`);
                join_params.push(this.tableName(table).fullname);
                join_params.push(`ON (` + this.buildWhere(on) + `)`);

                query_join_params.push(join_params.join(" "));
            } else {
                query_join_params.push(condition);
            }
        });

        return query_join_params.length ? query_join_params.join(" ") : null;
    }

    // builder options
    buildSelect(params, debug = false) {
        const table = this.tableName(params.table);

        const columns = params.columns ?? [`\`${table.alias ?? table.name}\`.*`];
        const joins = params.joins ?? [];
        const where = params.where ?? [];
        const group_by = params.group_by ?? [];
        const order_by = params.order_by ?? [];
        const limit = params.limit ?? null;
        const offset = params.offset ?? null;

        const query_columns_params = Array.isArray(columns) ? columns : [columns];
        const query_joins_params = this.buildJoin(joins);
        const query_where_params = this.buildWhere(where);

        const query_group_params = Array.isArray(group_by) ? group_by : [group_by];
        const query_order_params = Array.isArray(order_by) ? order_by : [order_by];

        // required
        const query_table = table.fullname;
        const query_columns = query_columns_params.join(", ");

        // optional
        const query_params = [];
        if (query_joins_params) query_params.push(query_joins_params);
        if (query_where_params) query_params.push(`WHERE ${query_where_params}`);
        if (query_group_params.length > 0) query_params.push(`GROUP BY ${query_group_params.join(", ")}`);
        if (query_order_params.length > 0) query_params.push(`ORDER BY ${query_order_params.join(", ")}`);
        if (limit) query_params.push(`LIMIT ${parseInt(limit)}`);
        if (offset || offset === 0) query_params.push(`OFFSET ${parseInt(offset)}`);

        const query = `SELECT ${query_columns} FROM ${query_table} ${query_params.join(" ")}`.trim();

        if (debug) console.log("params", params);
        if (debug) console.log("query", query);

        return query;
    }

    buildInsert(params, debug = false) {
        const table = this.tableName(params.table);

        const data_columns = [];
        const data_values = [];
        const query_table = table.name;

        if (params.data && params.data.length > 0) {
            params.data.map(row => {
                const values = [];
                const create_header = (data_columns.length === 0) ? true : false;

                Object.keys(row).map(key => {
                    if (create_header) data_columns.push(key);
                    values.push(this.getValue(row[key]));
                });

                data_values.push("(" + values.join(", ") + ")");
            });
        } else if (typeof params.data === "object") {
            const values = [];
            Object.keys(params.data).map(key => {
                data_columns.push(key);
                values.push(this.getValue(params.data[key]));
            });

            data_values.push("(" + values.join(", ") + ")");
        } else {
            return "data is empty";
        }

        const query = `INSERT INTO ${query_table} (\`${data_columns.join('\`, \`')}\`) VALUES \n${data_values.join(',\n')}`.trim();

        if (debug) console.log("params", params);
        if (debug) console.log("query", query);

        return query;
    }

    buildUpdate(params, debug = false) {
        const table = this.tableName(params.table);

        const query_set_params = [];
        if (params.data) {
            Object.keys(params.data).map(key => {
                query_set_params.push("`" + key + "`" + " = " + this.getValue(params.data[key]));
            });
        } else {
            return "data is empty";
        }

        const joins = params.joins ?? [];
        const where = params.where ?? [];

        const query_joins_params = this.buildJoin(joins);
        const query_where_params = this.buildWhere(where);

        // required
        const query_table = table.fullname;
        const query_set = query_set_params.join(", ");

        // optional
        const query_params = [];
        if (query_joins_params) query_params.push(query_joins_params);
        if (query_set_params) query_params.push(`SET ${query_set}`);
        if (query_where_params) query_params.push(`WHERE ${query_where_params}`);

        const query = `UPDATE ${query_table} ${query_params.join("  ")}`.trim();

        if (debug) console.log("params", params);
        if (debug) console.log("query", query);

        return query;
    }

    buildDelete(params, debug = false) {
        const table = this.tableName(params.table);

        const joins = params.joins ?? [];
        const where = params.where ?? [];

        const query_joins_params = this.buildJoin(joins);
        const query_where_params = this.buildWhere(where);

        // required
        const query_table = table.fullname;

        // optional
        const query_params = [];
        if (query_joins_params) query_params.push(query_joins_params);
        if (query_where_params) query_params.push(`WHERE ${query_where_params}`);

        const query = `DELETE FROM ${query_table} ${query_params.join(" ")}`.trim();

        if (debug) console.log("params", params);
        if (debug) console.log("query", query);

        return query;
    }

    toString() {
        return this.sql;
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