const QueryBuilder = require('./querybuilder');

console.clear();

const builder = new QueryBuilder();

const select_params = {};
select_params.table = "users";
select_params.fields = {
    id: "`users`.`ID`",
    name: "name",
    email: { lower: "email" },
    total_sales: { sum: "user_sale.total_paid" },
    computed_id: {
        concat: ["`id`", "-", "`name`"]
    }
};
select_params.joins = [];
select_params.joins.push({ table: "dependents", on: [{ field: "`users`.`id`", is: "`dependents`.`user_id`" }] });
select_params.joins.push({ table: "sales AS user_sale", on: [{ field: "`users`.`id`", is: "`user_sales`.`user_id`" }, { is_null: "canceled_at" }] });
select_params.where = [];
select_params.where.push({ field: "id", is: "2" });
select_params.where.push({ field: "nome", like: "teste's" });
select_params.where.push({ field: "phone", start_with: "21" });
select_params.where.push({ field: "email", end_with: "@gmail.com" });
select_params.where.push({ field: "password", is: "MD5('123456')" });
select_params.where.push({ field: "created_at", between: ["2022-01-01", "2022-01-31"] });
select_params.where.push({ is_null: "daleted_at" });

select_params.group_by = ["id"];

builder.buildSelect(select_params, true);

const insert_params = {};
insert_params.table = "users";
insert_params.data = [
    { nome: "teste", email: "", created_at: "NOW()" },
];

console.log(builder.buildInsert(insert_params, true));

const update_params = {};
update_params.table = "users";
update_params.data = { nome: "UPPER('teste')", email: "`confirmation_email`", updated_at: "NOW()" };
update_params.where = "ìd = LAST_INSERT_ID()";

console.log(builder.buildUpdate(update_params, true));
