const QueryBuilder = require('./querybuilder');

console.clear();

const builder = new QueryBuilder();

const select_params = {};
select_params.table = "users";
select_params.fields = ["id", "nome", "email"];
select_params.joins = [];
select_params.joins.push({ table: "dependents", on: [{ field: "`users`.`id`", is: "`table2`.`id`" }] });
select_params.where = [];
select_params.where.push({ field: "id", is: "2" });
select_params.where.push({ field: "nome", like: "teste's" });
select_params.where.push({ field: "phone", start_with: "21" });
select_params.where.push({ field: "email", end_with: "@gmail.com" });
select_params.where.push({ field: "password", is: "MD5('123456')" });
select_params.where.push({ field: "created_at", between: ["2022-01-01", "2022-01-31"] });
select_params.where.push({ is_null: "daleted_at" });

console.log(select_params);
console.log("\n");
console.log(builder.buildSelect(select_params));

const insert_params = {};
insert_params.table = "users";
insert_params.data = [
    { nome: "teste", email: "", created_at: "NOW()" },
];

console.log(insert_params);
console.log("\n");
console.log(builder.buildInsert(insert_params));

const update_params = {};
update_params.table = "users";
update_params.data = { nome: "UPPER('teste')", email: "`confirmation_email`", updated_at: "NOW()" };
update_params.where = "ìd = LAST_INSERT_ID()";

console.log(update_params);
console.log("\n");
console.log(builder.buildUpdate(update_params));


console.log("\n");
