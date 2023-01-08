declare module "dbwalker" {
    export default class DbWalker {
        constructor(connection_params?: any);
        uuid(): Promise<any>;
        select(params: any): any;
        insert(params: any): any;
        update(params: any): any;
        delete(params: any): any;
        query(sql: string): Promise<any>;
        run(sql: string): Promise<any>;
    }
}
