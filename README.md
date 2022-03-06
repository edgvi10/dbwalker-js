# Library to walking on database using serverless-mysql

You can build MySQL queries delivering an object as param and run using [serverless-mysql](https://www.npmjs.com/package/serverless-mysql).

## Connection

To connect to database, you need to pass the following parameters:
```js
// parsing inline connection data
const db = new DBWalker({host,user,pass,base});
// OR get from ".env" file
const db = new DBWalker();
```

Env variables:
```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASS=
DB_BASE=
```

---

## Usage

Raw SQL example:
```js
const raw = db.query("SELECT `alias`.* FROM `database`.`table` AS `alias` WHERE `alias`.`param` = ?", ["value"]);
```

You can use `select()`, `insert()`, `update()`, `delete()` methods to build your queries.

To execute your query, just start with `await` and `.run()` at last:

```js
const select = await db.select({table: "table"});
const insert = await db.insert({table: "table", data: {param: "value"}});
const update = await db.update({table: "table", data: {param: "value"}, where: ["param = 'value'"]});
const delete = await db.delete({table: "table", where: ["param = 'value'"]});
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
