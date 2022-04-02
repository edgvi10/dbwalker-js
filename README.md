# A Library to walk the database using serverless-mysql

The most flexible MySQL query builder, using [serverless-mysql](https://www.npmjs.com/package/serverless-mysql) to run and retrieve data.

![Downloads](https://img.shields.io/npm/dm/dbwalker)
![Version](https://img.shields.io/npm/v/dbwalker)
![License](https://img.shields.io/npm/l/dbwalker)
[![Rate this package](https://badges.openbase.com/js/rating/dbwalker.svg?token=NUVwNWBH2PA1GzC6N42h+UkjwU81AVGjpsBu8/tE7V4=)](https://openbase.com/js/dbwalker?utm_source=embedded&amp;utm_medium=badge&amp;utm_campaign=rate-badge)

You can use objects, arrays and strings to build your queries using easy-to-understand methods.

> IMPORTANT: this library is under development and stil in alpha. It's a very useful, but I don't recommend using it without a supervision.

## Connection

You can connect to the database in the following ways:
```js
// using a connection string
const db = new DBWalker("mysql://user:pass@host:port/base");
// parsing inline connection data
const db = new DBWalker({ host, ?port, user, pass, base });
// using array of connection data
const db = new DBWalker([host, ?port, user, pass, base]); // my fav to testing
// getting from ".env" file
const db = new DBWalker();
```

`.env` variables:

```env
DBWALKER_HOST=
DBWALKER_PORT=
DBWALKER_USER=
DBWALKER_PASS=
DBWALKER_BASE=
```

Or `.env` variable string:

```env
DBWALKER_STRING="mysql://user:pass@host:port/base"
```

---

## Usage

Raw SQL example:
```js
const raw = db.query("SELECT `alias`.* FROM `database`.`table` AS `alias` WHERE `alias`.`param` = ? ORDER BY ?", ["value", "field"]);
```

You can use `select()`, `insert()`, `update()`, `delete()` methods to build your queries.

```js
const select = await db.select({
    table: "table", 
    ?columns: [
        "table_alias.field_name AS field_alias",
    ],
    ?fields: {
        field_alias: "table.field_name",
        field_name: "field_name",
        function_return: "(SELECT GROUP_CONCAT(value) FROM table_other WHERE table_other.field = table.field GROUP BY table_other.field)",
        other_function_return: "(SELECT other_table.field FROM table_other AS other_table WHERE other_table.field = table.field ORDER BY other_table.field LIMIT 1)",
    }, 
    ?joins, 
    ?where: [
        "field_name > 8.9", // field_name > 8.9
        { "field_name": "value" }, // field_name = value
        { "field_name": true }, // field_name = 1
        { "field_name": 88.9 }, // field_name = 88.9
        { is_null: "field_name" }, // field_name IS NULL
        { not_null: "field_name" }, // field_name IS NOT NULL
        { is_empty: "field_name" }, // field_name = ''
        { not_empty: "field_name" }, // field_name != ''
        { field: "field_name", between: ["param", "param"] }, // field_name BETWEEN param AND param
        { field: "field_name", not_between: ["param", "param"] }, // field_name BETWEEN param AND param
        { field: "field_name", in: ["options_array"] }, // field_name IN (options_array)
        { field: "field_name", not_in: ["options_array"] }, // field_name NOT IN (options_array)
        { field: "field_name", like: "value" }, // field_name LIKE '%value%'
        { field: "field_name", not_like: "value" }, // field_name NOT LIKE '%value%'
        { field: "field_name", start_with: "value" }, // field_name LIKE 'value%'
        { field: "field_name", end_with: "value" }, // field_name LIKE '%value'
        { field: "field_name", find_in_set: "value" }, // FIND_IN_SET(value, field_name)'
    ],
    ?group_by: ["fields"], 
    ?order_by: ["fields"], 
    ?limit: int, 
    ?offset: int
});

const insert = await db.insert({
    table: "table", 
    data: {
        field_name: "value"
    }
});

const update = await db.update({
    table: "table", 
    ?joins, 
    data: {
        field_name: "value"
    }, 
    where: [(...)]
});

const delete = await db.delete({
    table: "table", 
    ?joins,
    where: [(...)]
});
```

Tou can use `.toString()` method to return a MySQL string:

```js
const select = db.select({
    table: "database.table AS table_alias", 
    columns: [
        "table_alias.column_name", 
        "table_alias.column_name AS column_alias"
    ]
}).toString();
```
```sql
SELECT table_alias.column_name, table_alias.column_name AS column_alias FROM `database`.`table` AS `table_alias`
```

Thanks to [sql-formatter](https://www.npmjs.com/package/sql-formatter), we can return a pretty sql string using the `.format()` method as following:

```js
const select = db.select({
    table: "database.table AS table_alias", 
    fields: { 
        field_alias: "table_alias.real_field_name"
    }
}).format();
```
```sql
SELECT
    table_alias.real_columnd_name AS `field_alias`
FROM 
    `database`.`table` AS `table_alias`
WHERE (...)
```

Using `.run()` returns a `<Promise>` with result or throw an error catchable.

Examples of use:
```js
const results = await dbwalker.select(select).run();
// { success: bool, rows: int, data: array }

dbwalker.insert(insert).run().then(res => { // { success: bool, insert_id: int, affected_rows: int }
    if(res.success) return dbwalker.select({
        table_name, 
        where: [
            { id: res.insert_id}
        ]
    });
});

dbwalker.update(update).run()// { success: bool, insert_id: int, affected_rows: int }
    .then(res => console.log(`${res.affected_rows} changed`))
    .catch(err => console.loc(err));

dbwalker.delete(update).run().catch(err => console.loc(err)).finaly(dbwalker.quit());