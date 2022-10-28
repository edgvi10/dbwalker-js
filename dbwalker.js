import SQLite from 'react-native-sqlite-storage';
import QueryBuilder from './../query-builder.js';

export default class DBWalker extends QueryBuilder {
    constructor() {
        super();
        this.sqlite = SQLite.openDatabase({ name: 'pdv-debug5.db', location: 'Documents' },
            ok => { },
            err => { throw err; }
        );

        return this;
    }

    install = async () => {
        console.log("Instalando Banco de Dados");
        const queue = [];

        queue.push(`CREATE TABLE IF NOT EXISTS company (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) UNIQUE,document CHAR(14) UNIQUE,insc_e CHAR(20) NOT NULL,insc_m CHAR(20) NOT NULL,iest CHAR(20) NOT NULL,cnae CHAR(20) NOT NULL,sn INTEGER(1) DEFAULT 1,is_sn INTEGER(1) DEFAULT 1,is_mei INTEGER DEFAULT 0,idCSC INTEGER,CSC VARCHAR(36),name VARCHAR(100) NOT NULL,fancyname VARCHAR(100) NOT NULL,email VARCHAR(100) NOT NULL,phone VARCHAR(14) NOT NULL,whatsapp VARCHAR(14) DEFAULT NULL,image_brand TEXT DEFAULT NULL,image_nf TEXT DEFAULT NULL,zipcode CHAR(8) NOT NULL,address VARCHAR(250) NOT NULL,address_number VARCHAR(50) NOT NULL,address_complement VARCHAR(100) DEFAULT NULL,neighborhood VARCHAR(50) NOT NULL,city VARCHAR(36) NOT NULL,city_code CHAR(10) NOT NULL,uf CHAR(2) NOT NULL,created_at VARCHAR(25) DEFAULT NULL,updated_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS company_data (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,group_name CHAR(15) NULL, key CHAR(15) NOT NULL, value TEXT DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS users_roles (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, name VARCHAR(50) NOT NULL, sync INTEGER(1) DEFAULT 0);`);
        queue.push(`CREATE TABLE IF NOT EXISTS users_permissions (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,permission_group VARCHAR(20) NOT NULL, name VARCHAR(50) NOT NULL, key CHAR(14) NOT NULL, sync INTEGER(1) DEFAULT 0);`);
        queue.push(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,sync INTEGER(1) DEFAULT 0,user_id INTEGER DEFAULT NULL, document CHAR(11) NOT NULL, name VARCHAR(50) NOT NULL, birthdate VARCHAR(10) DEFAULT NULL, email VARCHAR(100) NOT NULL, phone VARCHAR(14) NOT NULL, whatsapp VARCHAR(14) DEFAULT NULL, username VARCHAR(25) NOT NULL, password CHAR(32) NOT NULL, role_id INT NOT NULL DEFAULT 3, permissions TEXT NOT NULL, created_at VARCHAR(25) DEFAULT NULL, updated_at VARCHAR(25) DEFAULT NULL, deleted_at VARCHAR(25) DEFAULT NULL, blocked_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS users_logs (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, user_id INTEGER NOT NULL, action VARCHAR(25) NOT NULL, description TEXT DEFAULT NULL, created_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS users_data (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,user_id INTEGER NOT NULL, group_name CHAR(15) NULL, key CHAR(15) NOT NULL, value TEXT DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS customers (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL,sync INTEGER(1) DEFAULT 0, user_id INTEGER NOT NULL, document CHAR(14) NOT NULL, insc_e CHAR(20) DEFAULT NULL, insc_m CHAR(20) DEFAULT NULL, rg CHAR(20) DEFAULT NULL, cf INTEGER(1) DEFAULT 1, name VARCHAR(100) NOT NULL, fancyname VARCHAR(100) NOT NULL, birthdate VARCHAR(10) DEFAULT NULL, created_at VARCHAR(25) DEFAULT NULL, updated_at VARCHAR(25) DEFAULT NULL, deleted_at VARCHAR(25) DEFAULT NULL, blocked_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS customers_data (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, sync INTEGER(1) DEFAULT 0,customer_id INTEGER NOT NULL, group_name CHAR(15) NULL, key CHAR(15) NOT NULL, value TEXT DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS customers_addresses (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL,sync INTEGER(1) DEFAULT 0, customer_id INTEGER NOT NULL, main INTEGER(1) DEFAULT 0, label VARCHAR(50) NOT NULL, zipcode CHAR(8), address VARCHAR(250) NOT NULL, address_number VARCHAR(50) NOT NULL, address_complement VARCHAR(100) DEFAULT NULL, neighborhood VARCHAR(50) NOT NULL, city VARCHAR(50) NOT NULL, city_code CHAR(10) NOT NULL, uf CHAR(2) NOT NULL, address_info VARCHAR(250) DEFAULT NULL, lat VARCHAR(36), long VARCHAR(36), created_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS products_categories (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, sync INTEGER(1) DEFAULT 0,parent_id INTEGER DEFAULT NULL, name VARCHAR(100) NOT NULL, description TEXT DEFAULT NULL, thumbnail TEXT DEFAULT NULL, colorhex VARCHAR(10) DEFAULT "#212121", created_at VARCHAR(25) DEFAULT NULL, updated_at VARCHAR(25) DEFAULT NULL, deleted_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, sync INTEGER(1) DEFAULT 0,category_id INTEGER DEFAULT NULL, brand_id INTEGER DEFAULT NULL, ref_code VARCHAR(40) DEFAULT NULL, fav INTEGER(1) DEFAULT 0, barcode CHAR(14) NULL, ref INTEGER DEFAULT NULL, name VARCHAR(100) NOT NULL, description TEXT DEFAULT NULL, thumbnail TEXT DEFAULT NULL, unit_price REAL DEFAULT NULL, unit_cost REAL DEFAULT NULL, tributation_group INTEGER DEFAULT NULL, gtin CHAR(14) DEFAULT NULL, ncm CHAR(8) DEFAULT NULL, cfop CHAR(8) DEFAULT NULL, cest CHAR(8) DEFAULT NULL, ipi CHAR(8) DEFAULT NULL, pis CHAR(8) DEFAULT NULL, cofins CHAR(8) DEFAULT NULL, vTotTrib REAL DEFAULT 0, available_amount REAL DEFAULT 0, kit INTEGER(1) DEFAULT 0, stuff INTEGER(1) DEFAULT 0, production INTEGER(1) DEFAULT 0, production_place VARCHAR(50) DEFAULT NULL, stock_location VARCHAR(50) DEFAULT NULL, stock_min REAL DEFAULT 0, unit_name VARCHAR(2) DEFAULT NULL, unit_amount REAL DEFAULT 0, unit_fractioned tinyint DEFAULT 0, volume VARCHAR(200) DEFAULT NULL, volume_type CHAR(20) DEFAULT NULL, volume_weight REAL DEFAULT NULL, created_at VARCHAR(25) DEFAULT NULL, updated_at VARCHAR(25) DEFAULT NULL, deleted_at VARCHAR(25) DEFAULT NULL, blocked_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS products_stock (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, sync INTEGER(1) DEFAULT 0,user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, barcode CHAR(14) NULL, amount REAL DEFAULT 0, amount_before REAL DEFAULT 0, origin VARCHAR(50) DEFAULT NULL, type CHAR(20) DEFAULT NULL, description TEXT DEFAULT NULL, created_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS products_data (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,product_id INTEGER NOT NULL,sync INTEGER(1) DEFAULT 0, group_name CHAR(15) NULL, key CHAR(15) NOT NULL, value TEXT DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS payment_methods (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL, sync INTEGER(1) DEFAULT 0,code CHAR(10) DEFAULT '00', type INTEGER DEFAULT 0, name VARCHAR(20) NOT NULL, active INTEGER DEFAULT 0);`);
        queue.push(`CREATE TABLE IF NOT EXISTS checkout_session (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) UNIQUE, open_user CHAR(36) DEFAULT NULL,sync INTEGER(1) DEFAULT 0, open_at VARCHAR(25) DEFAULT NULL, open_amount REAL DEFAULT 0, close_user CHAR(36) DEFAULT NULL, close_at VARCHAR(25) DEFAULT NULL, close_amount REAL DEFAULT 0, total_sales REAL DEFAULT 0, closed INTEGER(1) DEFAULT 0);`);
        queue.push(`CREATE TABLE IF NOT EXISTS checkout_move (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,user_uuid INTEGER NOT NULL, sync INTEGER(1) DEFAULT 0,session_id CHAR(36) DEFAULT NULL, type INT DEFAULT 1, value REAL, info TEXT, created_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS checkout (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,session_id CHAR(36) DEFAULT NULL,sync INTEGER(1) DEFAULT 0, device VARCHAR(30) DEFAULT NULL,user_id INTEGER NOT NULL, order_type CHAR(10) NOT NULL, seller_id INTEGER NOT NULL, seller_name VARCHAR(50) NOT NULL, customer_id INTEGER DEFAULT NULL, customer_name VARCHAR(50) DEFAULT NULL, customer_document CHAR(14) DEFAULT NULL, customer_phone CHAR(14) DEFAULT NULL, delivery INTEGER DEFAULT 0, delivery_date VARCHAR(25) DEFAULT NULL, delivery_route INT DEFAULT NULL, delivery_zipcode CHAR(8) DEFAULT NULL, delivery_address VARCHAR(150) DEFAULT NULL, delivery_number VARCHAR(10) DEFAULT NULL, delivery_complement VARCHAR(50) DEFAULT NULL, delivery_neighborhood VARCHAR(50) DEFAULT NULL, delivery_city VARCHAR(150) DEFAULT NULL, delivery_state CHAR(2) DEFAULT NULL, delivery_latlng VARCHAR(100) DEFAULT NULL, status INTEGER DEFAULT 0, production_request VARCHAR(25) DEFAULT NULL, production_start VARCHAR(25) DEFAULT NULL, production_end VARCHAR(25) DEFAULT NULL, delivered_at VARCHAR(25) DEFAULT NULL, receipt_id INTEGER DEFAULT NULL,created_at VARCHAR(25) DEFAULT NULL, updated_at VARCHAR(25) DEFAULT NULL, canceled_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS checkout_items (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,checkout_uuid char(36) NOT NULL,sync INTEGER(1) DEFAULT 0,product_id INTEGER NOT NULL,barcode CHAR(14) NULL, name VARCHAR(100), unit_name CHAR(2) DEFAULT 'UN', amount REAL DEFAULT 0, cost_price REAL DEFAULT 0, original_price REAL DEFAULT 0, unit_price REAL DEFAULT 0, tributation_group INTEGER DEFAULT NULL, cfop CHAR(8) DEFAULT NULL, vTotTrib REAL DEFAULT 0, ncm CHAR(8) DEFAULT NULL, discount_price REAL DEFAULT 0, discount_percentage INTEGER DEFAULT '0', created_at VARCHAR(25) DEFAULT NULL, updated_at VARCHAR(25) DEFAULT NULL, canceled_at VARCHAR(25) DEFAULT NULL, canceled_reason VARCHAR(100) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS checkout_payments (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL,sync INTEGER(1) DEFAULT 0, checkout_uuid char(36) NOT NULL, payment_method_id INTEGER NOT NULL, price_amount REAL DEFAULT 0, created_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS checkout_item_production (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, sync INTEGER(1) DEFAULT 0,checkout_uuid char(36) NOT NULL, item_id INTEGER NOT NULL, delivery INTEGER DEFAULT 0, created_at VARCHAR(25) DEFAULT NULL, started_at VARCHAR(25) DEFAULT NULL, finished_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS checkout_item_delivery (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL,sync INTEGER(1) DEFAULT 0, checkout_uuid char(36) NOT NULL, delivery_id INTEGER NOT NULL, item_id INTEGER NOT NULL, created_at VARCHAR(25) DEFAULT NULL, started_at VARCHAR(25) DEFAULT NULL, finished_at VARCHAR(25) DEFAULT NULL, canceled_at VARCHAR(25) DEFAULT NULL, canceled_reason VARCHAR(100) DEFAULT NULL);`);

        queue.push(`CREATE TABLE IF NOT EXISTS delivery_routes (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,name VARCHAR(50) NOT NULL, sync INTEGER(1) DEFAULT 0,description TEXT DEFAULT NULL, deliverer_id INTEGER DEFAULT NULL, deliverer_name VARCHAR(50), deliverer_phone VARCHAR(15), vehicle_name VARCHAR(50), vehicle_plate VARCHAR(8), delivery_start VARCHAR(25) DEFAULT NULL, delivery_end VARCHAR(25) DEFAULT NULL, created_at VARCHAR(25) DEFAULT NULL);`);
        queue.push(`CREATE TABLE IF NOT EXISTS deliverers (id INTEGER PRIMARY KEY AUTOINCREMENT, uuid CHAR(36) DEFAULT NULL,name VARCHAR(50) NOT NULL,sync INTEGER(1) DEFAULT 0, document CHAR(14) NOT NULL, phone VARCHAR(15) NOT NULL, email VARCHAR(50) NOT NULL, password VARCHAR(50) NOT NULL, vehicle_name VARCHAR(50), vehicle_plate VARCHAR(8), created_at VARCHAR(25) DEFAULT NULL, updated_at VARCHAR(25) DEFAULT NULL, deleted_at VARCHAR(25) DEFAULT NULL, blocked_at VARCHAR(25) DEFAULT NULL);`);

        queue.push(`CREATE TABLE IF NOT EXISTS receipts (id INTEGER PRIMARY KEY AUTOINCREMENT,uuid CHAR(36) DEFAULT NULL, checkout_uuid char(36) NOT NULL, sync INTEGER(1) DEFAULT 0,number VARCHAR(25) NOT NULL, serie VARCHAR(15) DEFAULT NULL, status VARCHAR(20) DEFAULT 'contingency', key VARCHAR(44) NOT NULL, protocol VARCHAR(25), xml TEXT, rejected_reason varchar(255) DEFAULT NULL, created_at VARCHAR(25) DEFAULT NULL, canceled_at VARCHAR(25) DEFAULT NULL, canceled_protocol VARCHAR(25), canceled_reason TEXT);`);

        queue.push("INSERT INTO users_roles (name) VALUES ('Administrador'), ('Gerente'), ('Operador de caixa')");
        queue.push("INSERT INTO payment_methods (code, name) VALUES ('01', 'DINHEIRO'),('17', 'PIX'), ('03', 'CREDITO'), ('04', 'DEBITO')");

        console.log(`Instalando ${queue.length} queries`);

        try {
            // console.log(queue);

            for (const script of queue) {
                // console.log(script)
                const execute = await this.query(script);
                console.log(execute);
            }
        } catch (error) {
            console.log(error.message);
        }
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