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
        accepted_functions = [...accepted_functions, "UUID", "DATE", "NOW", "CURDATE", "CURTIME", "UNIX_TIMESTAMP", "MD5", "SHA1", "SHA2", "RAND", "LENGTH", "LOWER", "UPPER", "SUBSTRING", "CONCAT", "CONCAT_WS", "REPLACE", "TRIM", "LEFT", "RIGHT", "LTRIM", "RTRIM"];

        const regex = new RegExp(`^(${accepted_functions.join("|")})\((.*)\)$`, "i");
        const is_function = regex.test(value);

        if (is_function) {
            const [, func, args] = value.match(regex);
            return `${func.toUpperCase()}${args}`;
        }

        if (value === null) return "NULL";

        if (value instanceof Date) {
            return `'${value.toISOString().toString().replace(/[T]/g, " ").slice(0, -5)}'`;
        } else if (typeof value === "object") {
            const key = Object.keys(value)[0];
            if (accepted_functions.includes(key.toUpperCase()))
                return `${key.toUpperCase()}(${this.getValue(value[key])})`;
        } else {
            switch (typeof value) {
                case "string": value = (value.slice(0, 1) === "`" && value.slice(-1) === "`") ? value : "'" + this.escapeString(value).trim("'") + "'"; break;
                case "number": value = parseFloat(value); break;
                case "null": value = "NULL"; break;
                case "boolean": value = value ? 1 : 0; break;
            }
        }

        return value;
    }

    objectToParam(params) {
        var operators = ["=", "<", ">", "<=", ">=", "<>", "!="];
        var param = [];
        for (var key in params) {
            if (key === "field" || key === "column") param.push(params[key]);

            else if (key === "is") param.push("= " + this.getValue(params[key]));
            else if (key === "not_is") param.push("!= " + this.getValue(params[key]));
            else if (key === "like") param.push("LIKE '%" + this.trim(this.escapeString(params[key]), "%") + "%'");
            else if (key === "not_like") param.push("NOT LIKE '%" + this.escapeString(params[key]) + "%'");
            else if (key === "start_with") param.push("LIKE '" + this.escapeString(params[key]) + "%'");
            else if (key === "end_with") param.push("LIKE '%" + this.escapeString(params[key]) + "'");
            else if (key === "in") param.push("IN (" + this.getValue(params[key]) + ")");
            else if (key === "not_in") param.push("NOT IN (" + params[key].map(item => this.getValue(item)).join(",") + ")");
            else if (key === "between" || key === "is_between") param.push("BETWEEN " + this.getValue(params[key][0]) + " AND " + this.getValue(params[key][1]));
            else if (key === "not_between") param.push("NOT BETWEEN " + this.getValue(params[key][0]) + " AND " + this.getValue(params[key][1]));
            else if (key === "is_null") param.push(`${params[key]} IS NULL`);
            else if (key === "not_null" || key === "is_not_null") param.push(`${params[key]} IS NOT NULL`);
            else if (key === "is_empty") param.push(`${params[key]} = ''`);
            else if (key === "not_empty") param.push(`${params[key]} != ''`);
            else if (key === "find_in_set") param.push(`FIND_IN_SET(${this.getValue(params[key])}, \`${this.trim(params["field"], "`")}\`)`);
            else param.push(key + " = " + this.getValue(params[key]))
        }

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
            } else if (typeof condition === "object" && !Array.isArray(condition) && condition !== null) {
                query_where_params.push(this.objectToParam(condition));
            } else if (typeof condition === "string") {
                query_where_params.push(condition);
            } else {
                throw new Error("Invalid where condition");
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
            } else if (typeof condition === "object") {
                const join_params = [];
                join_params.push((condition.type ? condition.type.toUpperCase() : "LEFT") + " JOIN");
                join_params.push(this.tableName(condition.table).fullname);
                if (condition.on) join_params.push(`ON (` + this.buildWhere(condition.on) + `)`);
                if (condition.using) join_params.push(`USING (${condition.using})`);

                query_join_params.push(join_params.join(" "));
            } else {
                query_join_params.push(condition);
            }
        });

        return query_join_params.length ? query_join_params.join(" ") : null;
    }

    getColumn(raw_fields) {
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
                            var values = raw_fields[key][fn];
                            if (typeof values === "string") values = [values];

                            values = values.join(", ");
                        }

                        switch (fn) {
                            case "count_distinct": fields.push(`COUNT(DISTINCT \`${value}\`) AS \`${key}\``); break;
                            case "concat": fields.push(`CONCAT(${values}) AS \`${key}\``); break;
                            case "group_concat": fields.push(`GROUP_CONCAT(${value}) AS \`${key}\``); break;
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
        const table = (params.table) ? this.tableName(params.table) : null;

        var columns = [];
        if (typeof params.columns === "string" || typeof params.fields === "string") columns.push(params.columns || params.fields);
        else if (params.columns || params.fields) columns = params.columns || params.fields;

        const columns_array = this.getColumn(columns);
        if (table && columns_array.length === 0) columns_array.push(`${table.alias ? table.alias : table.name}.*`);

        const joins = params.joins ? params.joins : [];
        const where = params.where ? params.where : [];
        const having = params.having ? params.having : [];
        const group_by = params.group_by ? params.group_by : [];
        const order_by = params.order_by ? params.order_by : [];
        const limit = (!isNaN(params.limit)) ? params.limit : null;
        const offset = (!isNaN(params.offset)) ? params.offset : null;

        const query_columns_params = columns_array;
        const query_joins_params = this.buildJoin(joins);
        const query_where_params = this.buildWhere(where);
        const query_having_params = this.buildWhere(having);

        const query_group_params = Array.isArray(group_by) ? group_by : [group_by];
        const query_order_params = Array.isArray(order_by) ? order_by : [order_by];

        // required
        const query_table = (table) ? table.fullname : null;
        const query_columns = query_columns_params.join(", ");

        // optional
        const query_params = [];
        query_params.push(`${query_columns}`);
        if (query_table) query_params.push(`FROM ${query_table}`);
        if (query_joins_params) query_params.push(query_joins_params);
        if (query_where_params) query_params.push(`WHERE ${query_where_params}`);
        if (query_group_params.length > 0) query_params.push(`GROUP BY ${query_group_params.join(", ")}`);
        if (query_having_params) query_params.push(`HAVING ${query_having_params}`);
        if (query_order_params.length > 0) query_params.push(`ORDER BY ${query_order_params.join(", ")}`);
        if (limit) query_params.push(`LIMIT ${parseInt(limit)}`);
        if (offset || offset === 0) query_params.push(`OFFSET ${parseInt(offset)}`);

        const query = `SELECT ${query_params.join(" ")};`.trim();

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
        const query_params = [];
        query_params.push(`${query_table}`);
        query_params.push(`(\`${data_columns.join('\`, \`')}\`)`);
        query_params.push(`VALUES \n${data_values.join(",\n")}`);

        const query = `INSERT INTO ${query_params.join(" ")};`.trim();

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

        const joins = params.joins ? params.joins : [];
        const where = params.where ? params.where : [];
        const having = params.having ? params.having : [];

        const query_joins_params = this.buildJoin(joins);
        const query_where_params = this.buildWhere(where);
        const query_having_params = this.buildWhere(having);

        // required
        const query_table = table.fullname;
        const query_set = query_set_params.join(", ");

        // optional
        const query_params = [];
        query_params.push(`${query_table}`);
        if (query_joins_params) query_params.push(query_joins_params);
        if (query_set_params) query_params.push(`SET ${query_set}`);
        if (query_where_params) query_params.push(`WHERE ${query_where_params}`);
        if (query_having_params) query_params.push(`HAVING ${query_having_params}`);

        const query = `UPDATE ${query_params.join(" ")};`.trim();

        return query;
    }

    buildDelete(params, debug = false) {
        const table = this.tableName(params.table);

        if (!params.secure === false && !params.where) return "delete without where is not allowed";

        const where = params.where ? params.where : [];

        const query_where_params = this.buildWhere(where);

        // required
        const query_table = table.fullname;

        // optional
        const query_params = [];
        query_params.push(`FROM ${query_table}`);
        if (query_where_params) query_params.push(`WHERE ${query_where_params}`);

        const query = `DELETE ${query_params.join(" ")};`.trim();

        return query;
    }
}

module.exports = QueryBuilder; 