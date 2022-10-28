console.clear();

const DBWalker = require("./dbwalker.js");

const dbwalker = new DBWalker();

(async () => {
    try {
        const select_uuid = await dbwalker.query("SELECT UUID() AS uuid");
        console.log("query", select_uuid);

        await dbwalker.quit();
        // await dbwalker.query("SELECT UUID() AS uuid").then(data => {
        //     console.log("query then", data);
        // });

        // const select = await dbwalker.select("SELECT UUID() AS uuid").run().then(result => result);
        // console.log("select", select);

        // await dbwalker.select("SELECT UUID() AS uuid").run().then(result => {
        //     console.log("select then", result);
        // }).catch(error => {
        //     console.log(error);
        // });

        // await dbwalker.select("SELECT UUIDs() ASDFA uuid").run().catch(error => {
        //     console.log("catch", error);
        // });

    } catch (error) {
        console.log(error);
    }
})();