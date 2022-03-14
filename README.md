# A Library to walk the database using serverless-mysql

The most flexible MySQL query builder, using [serverless-mysql](https://www.npmjs.com/package/serverless-mysql) to run and retrieve data.

[![Rate this package](https://badges.openbase.com/js/rating/dbwalker.svg?token=NUVwNWBH2PA1GzC6N42h+UkjwU81AVGjpsBu8/tE7V4=)](https://openbase.com/js/dbwalker?utm_source=embedded&amp;utm_medium=badge&amp;utm_campaign=rate-badge) [![dbwalker Versions](https://badges.openbase.com/js/versions/dbwalker.svg?token=NUVwNWBH2PA1GzC6N42h+UkjwU81AVGjpsBu8/tE7V4=)](https://openbase.com/js/dbwalker?utm_source=embedded&amp;utm_medium=badge&amp;utm_campaign=rate-badge)

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
// SELECT `alias`.* FROM `database`.`table` AS `alias` WHERE `alias`.`param` = 'value' ORDER BY field
```

You can use `select()`, `insert()`, `update()`, `delete()` methods to build your queries.

To execute your query, just start with `await` and `.run()` at last:

```js
const select = await db.select({table: "table", ?columns, ?joins, ?where, ?group_by, ?order_by, ?limit, ?offset});
const insert = await db.insert({table: "table", data: {param: "value"}});
const update = await db.update({table: "table", ?joins, data: {param: "value"}, where: ["param = 'value'"]});
const delete = await db.delete({table: "table", ?joins, where: ["param = 'value'"]});
```

To return sql query, you can use `.toString()` method:
```js
const select_users = db.select({table: "database.table AS alias"}).toString();
```
```sql
SELECT `alias`.* FROM `database`.`table` AS `alias`
```

---

A fully select query:
```js
const select_params = {
    table: "database.table AS alias_table",
    columns: [
        "alias_table.field AS field_1",
        "COUNT(alias_table_2.field) AS field_count"
    ],
    joins: [
        [
            "LEFT",
            "database.table_2 AS alias_table_2",
            [
                "alias_table.field_2 = alias_table_2.field",
                "alias_table_2.field_2 = NULL",
            ]
        ],
        [
            "RIGHT",
            "database.table_3 AS alias_table_3",
            [
                "alias_table.field_3 = alias_table_3.field"
            ]
        ]
    ],
    where: [
        "params = 1",
        "alias_table.field = 'value'",
        [
            "alias_table_2.field > 18",
            "alias_table_2.field < 30"
        ],
        "alias_table_3.field = NULL",
    ],
    order_by: [
        "alias_table.field ASC",
        "alias_table_2.field DESC"
    ],
    group_by: [
        "alias_table_3.field"
    ],
    limit: 10,
    offset: 0
}

const select_user = db.select(select_params).toString();
```
```sql
SELECT alias_table.field AS field_1, COUNT(alias_table_2.field) AS field_count FROM `database`.`table` AS `alias_table` LEFT JOIN `database`.`table_2` AS `alias_table_2` ON (alias_table.field_2 = alias_table_2.field AND alias_table_2.field_2 = NULL) RIGHT JOIN `database`.`table_3` AS `alias_table_3` ON (alias_table.field_3 = alias_table_3.field) WHERE params = 1 AND alias_table.field = 'value' AND (alias_table_2.field > 18 OR alias_table_2.field < 30) AND alias_table_3.field = NULL GROUP BY alias_table_3.field ORDER BY alias_table.field ASC, alias_table_2.field DESC LIMIT 10 OFFSET 0
```
