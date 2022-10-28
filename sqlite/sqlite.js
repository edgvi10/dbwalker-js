import SQLite from 'react-native-sqlite-storage';
import QueryBuilder from './query-builder.js';

export default class DBWalker extends QueryBuilder {

    constructor(db_name) {
        super();
        this.sqlite = SQLite.openDatabase({ name: db_name, location: 'Documents' },
            ok => { },
            err => { throw err; }
        );

        return this;
    }

    toString() {
        return this.sql;
    }

    query = async (sql, params = []) => {
        try {
            if (typeof sql !== 'string') sql = this.sql;

            const result = await new Promise((resolve, reject) => {
                this.sqlite.transaction(tx => {
                    tx.executeSql(sql, [...params], (tx, results) => {
                        const is_select = (sql.toLowerCase().indexOf('select') === 0);

                        const $return = {};
                        $return.raw = results;
                        if (results.rowsAffected > 0) $return.affectedRows = results.rowsAffected;
                        if (results.insertId) $return.insertId = results.insertId;

                        if (is_select) {
                            $return.data = results.rows.raw();
                            resolve($return.data);
                        }

                        resolve($return);
                    }, err => {
                        reject(err);
                        throw new Error(err);
                    });
                });
            });

            return result;
        } catch (error) {
            throw error;
        }
    };

    run = async () => {
        try {
            return await this.query(this.sql);
        } catch (error) {
            throw error;
        }
    };

    getTables = async (params) => {
        try {
            if (!params) params = {};
            const select_tables_params = {
                table: "sqlite_master",
                fields: { sql: "sql" },
                where: ["type = 'table'", "tbl_name NOT LIKE 'sqlite_%'", "tbl_name NOT LIKE 'android_%'",]
            };

            if (params.table_name) select_tables_params.where.push("tbl_name IN ('" + params.table_name.split(",").join("','") + "')");

            const select_tables_sql = this.select(select_tables_params).toString();
            const select_tables_result = await this.query(select_tables_sql);

            const select_tables = [];
            for (const row of select_tables_result) {
                const table_scheme = row.sql;
                const table_name = table_scheme.match(/CREATE TABLE (\w+) \(/)[1];
                const columns = [];
                const columns_scheme = table_scheme.match(/\((.*)\)/)[1].split(',');
                for (var column_scheme of columns_scheme) {
                    column_scheme = column_scheme.trim().split(" ");
                    var [name, type, ...attr] = column_scheme;
                    attr = attr.join(" ");

                    columns.push({ name, type, attr });
                }

                select_tables.push({ table_name, columns });
            }

            return select_tables;
        } catch (err) {
            console.log(err);
            throw err;
        }
    }

    describe = async (table_name) => {
        try {
            const describe = await this.getTables({ table_name });

            if (describe.length === 0) throw new Error("Table not found");
            if (describe[0].columns.length === 0) throw new Error("Table not found");

            return describe[0].columns;
        } catch (err) {
            throw err;
        }
    };


    createTable(params) {
        this.sql = (typeof params === 'string') && params;

        if (typeof params === 'object') {
            try {
                const { name, fields, engine, charset, collate, comment } = params;

                const query_fields = [];
                fields.map(field => {
                    if (typeof field === "string") {
                        query_fields.push(field);
                    } else if (typeof field === "object") {
                        const field_parts = [];
                        field_parts.push(`\`${field.field}\``);
                        field_parts.push(`${field.type}`);
                        if (field.nullable) field_parts.push("NULL");
                        if (field.default) field_parts.push(`DEFAULT '${field.default}'`);
                        if (field.extra) field_parts.push(field.extra);

                        query_fields.push(field_parts.join(" "));
                    }
                });

                this.sql = `CREATE TABLE IF NOT EXISTS \`${this.tableName(table).fullname}\` (${query_fields.join(", ")})`;
            } catch (e) {
                throw new Error(e);
            }
        }

        return this;
    }

    alterTable(params) {
        this.sql = (typeof params === 'string') && params;

        if (typeof params === 'object') {
            try {
                const { table, fields, engine, charset, collate, comment } = params;
                const current_fields = this.describe(table);

                const query_fields = [];
                fields.map(field => {
                    if (typeof field === "string") {
                        query_fields.push(field);
                    } else if (typeof field === "object") {
                        const field_parts = [];
                        field_parts.push(`\`${field.field}\``);
                        field_parts.push(`${field.type}`);
                        if (field.nullable) field_parts.push("NULL");
                        if (field.default) field_parts.push(`DEFAULT '${field.default}'`);
                        if (field.extra) field_parts.push(field.extra);
                        if (field.after) field_parts.push(`AFTER \`${field.after}\``);


                    }
                });

                this.sql = `ALTER TABLE \`${this.tableName(table).fullname}\` \n${query_fields.join(", ")}`;
            } catch (e) {
                throw new Error(e);
            }
        }
        return this;
    }

    select(params) {
        this.sql = (typeof params === 'string') ? params : this.buildSelect(params);
        return this;
    };

    insert(params) {
        this.sql = (typeof params === 'string') ? params : this.buildInsert(params);
        return this;
    };

    update(params) {
        this.sql = (typeof params === 'string') ? params : this.buildUpdate(params);
        return this;
    };

    delete(params) {
        this.sql = (typeof params === 'string') ? params : this.buildDelete(params);
        return this;
    };
}