const { format } = require("sql-formatter");

class QueryBuilder {
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

    trim(str, char) {
        if (char) {
            return str.replace(new RegExp(`^[${char}]+|[${char}]+$`, "g"), "");
        } else {
            return str.replace(/^\s+|\s+$/g, "");
        }
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

    getValue(value, accepted_functions = []) {
        accepted_functions = [...accepted_functions, "NOW", "CURDATE", "CURTIME", "UNIX_TIMESTAMP", "MD5", "SHA1", "SHA2", "RAND", "LENGTH", "LOWER", "UPPER", "SUBSTRING", "CONCAT", "CONCAT_WS", "REPLACE", "TRIM", "LEFT", "RIGHT", "LTRIM", "RTRIM"];

        if (accepted_functions.indexOf(value.toUpperCase().split("(")[0]) > -1)
            return value;
        else if (value.slice(0, 1) === "'" && value.slice(-1) === "'")
            return value;


        switch (typeof value) {
            case "string": value = (value.slice(0, 1) === "`" && value.slice(-1) === "`") ? value : "'" + this.escapeString(value) + "'"; break;
            case "number": value = parseFloat(value); break;
            case "null": value = "NULL"; break;
            case "boolean": value = value ? 1 : 0; break;
            default: value = "''"; break;
        }

        return value;
    }

    objectToParam(params) {
        var param = [];

        Object.keys(params).map(key => {
            if (key === "field") param.push(`\`${this.trim(params[key], "`")}\``);
            else if (key === "is") param.push("= " + this.getValue(params[key]));
            else if (key === "not_is") param.push("!= " + this.getValue(params[key]));
            else if (key === "like") param.push("LIKE '%" + this.trim(this.escapeString(params[key]), "%") + "%'");
            else if (key === "not_like") param.push("NOT LIKE '%" + this.escapeString(params[key]) + "%'");
            else if (key === "start_with") param.push("LIKE '" + this.escapeString(params[key]) + "%'");
            else if (key === "end_with") param.push("LIKE '%" + this.escapeString(params[key]) + "'");
            else if (key === "in") param.push("IN (" + this.getValue(params[key]) + ")");
            else if (key === "not_in") param.push("NOT IN (" + this.getValue(params[key]) + ")");
            else if (key === "between") param.push("BETWEEN " + this.getValue(params[key][0]) + " AND " + this.getValue(params[key][1]));
            else if (key === "not_between") param.push("NOT BETWEEN " + this.getValue(params[key][0]) + " AND " + this.getValue(params[key][1]));
            else if (key === "is_null") param.push(`\`${params[key].trim("`")}\` IS NULL`);
            else if (key === "not_is_null") param.push(`\`${params[key].trim("`")}\` IS NOT NULL`);
            else if (key === "is_empty") param.push(`\`${this.trim(params[key], "`")}\` = ''`);
            else if (key === "find_in_set") param.push(`FIND_IN_SET(${this.getValue(params[key])}, \`${this.trim(params["field"], "`")}\`)`);
        });

        return param.join(" ");
    }

    buildWhere(where_param) {
        const query_where_params = [];
        if (typeof where_param === "string") return where_param;

        where_param.map(condition => {
            if (Array.isArray(condition)) {
                const where_params = [];
                condition.map(condition_item => {
                    if (typeof condition_item === "object") {
                        where_params.push(this.objectToParam(condition_item));
                    } else {
                        where_params.push(condition_item);
                    }
                });

                query_where_params.push(`(${where_params.join(" OR ")})`);
            } else if (typeof condition === "object") {
                query_where_params.push(this.objectToParam(condition));
            } else {
                query_where_params.push(condition);
            }
        });

        return query_where_params.length ? query_where_params.join(" AND ") : null;
    }

    buildJoin(join_param) {
        const query_join_params = [];
        join_param.map(condition => {
            if (typeof condition === "object") {
                const join_params = [];
                join_params.push((condition.type ? condition.type.toUpperCase() : "LEFT") + " JOIN");
                join_params.push(this.tableName(condition.table).fullname);
                if (condition.on) join_params.push(`ON (` + this.buildWhere(condition.on) + `)`);
                if (condition.using) join_params.push(`USING (${condition.using})`);

                query_join_params.push(join_params.join(" "));
            } else if (Array.isArray(condition)) {
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

    getFields(raw_fields) {
        const fields = [];

        if (typeof raw_fields === "string") {
            fields.push(raw_fields);
        } else if (Array.isArray(raw_fields)) {
            raw_fields.map(field => {
                if (typeof field === "string") {
                    fields.push(field);
                } else if (typeof field === "object") {
                    fields.push(`${field.field} AS \`${field.alias}\``);
                }
            });
        } else if (typeof raw_fields === "object") {
            Object.keys(raw_fields).map(key => {
                if (typeof raw_fields[key] === "string") {
                    fields.push(`${raw_fields[key]} AS \`${key}\``);
                } else if (typeof raw_fields[key] === "object") {
                    Object.keys(raw_fields[key]).map(fn => {
                        var default_fn;
                        if (typeof raw_fields[key][fn] === "string") {
                            var value = raw_fields[key][fn];
                            value = value.split(".").join("`.`");

                            default_fn = `${fn.toUpperCase()}(\`${value}\`) AS \`${key}\``;
                        } else {
                            console.log(raw_fields[key][fn]);
                            var values = raw_fields[key][fn];
                            if (typeof values === "string") values = [values];

                            values = values.join(", ");
                        }

                        switch (fn) {
                            case "count_distinct": fields.push(`COUNT(DISTINCT \`${value}\`) AS \`${key}\``); break;
                            case "concat": fields.push(`CONCAT(${values}) AS \`${key}\``); break;
                            case "group_concat": fields.push(`GROUP_CONCAT(${values}) AS \`${key}\``); break;
                            default: fields.push(default_fn); break
                        }
                    });
                }
            });
        }

        return fields;
    }

    format(query) {
        return format(query, { language: "mysql", indent: "    ", uppercase: true });
    }

    // builder options
    buildSelect(params, debug = false) {
        const table = this.tableName(params.table);

        var columns = [];
        if (params.fields) columns = this.getFields(params.fields);
        if (columns.length === 0) columns = [`\`${table.alias ?? table.name}\`.*`];

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
        if (debug) console.log("query", this.format(query));

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
        if (debug) console.log("query", this.format(query));

        return query;
    }

    buildUpdate(params, debug = false) {
        const table = this.tableName(params.table);

        const query_set_params = [];
        if (params.data) {
            Object.keys(params.data).map(key => {
                query_set_params.push("`" + key.trim("`") + "`" + " = " + this.getValue(params.data[key]));
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
        if (debug) console.log("query", this.format(query));

        return query;
    }

    buildDelete(params, debug = false) {
        const table = this.tableName(params.table);

        const joins = params.joins ?? [];
        if (!params.where || params.length === 0) return "where is empty";
        const where = params.where;

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
        if (debug) console.log("query", this.format(query));

        return query;
    }
}

module.exports = QueryBuilder;