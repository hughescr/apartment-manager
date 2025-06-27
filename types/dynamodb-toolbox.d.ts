declare module 'dynamodb-toolbox' {
    import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

    interface TableConstructor {
        name: string
        partitionKey: string
        sortKey?: string
        DocumentClient: DynamoDBDocumentClient
    }

    class Table {
        constructor(properties: TableConstructor);
        scan<T = any>(): { exec(): Promise<{ Items?: T[], Count?: number, ScannedCount?: number }> };
        get<T = any>(key: any): { exec(): Promise<{ Item?: T }> };
        put<T = any>(item: T): { exec(): Promise<void> };
        update<T = any>(item: any): { exec(): Promise<{ Attributes?: T }> };
        delete(key: any): { exec(): Promise<void> };
    }

    interface EntityConstructor {
        name: string
        attributes: Record<string, any>
        table: Table
    }

    class Entity {
        constructor(properties: EntityConstructor);
        scan<T = any>(): { exec(): Promise<{ Items?: T[], Count?: number, ScannedCount?: number }> };
        get<T = any>(key: any): { exec(): Promise<{ Item?: T }> };
        put<T = any>(item: T): { exec(): Promise<void> };
        update<T = any>(item: any): { exec(): Promise<{ Attributes?: T }> };
        delete(key: any): { exec(): Promise<void> };
        query<T = any>(partitionKey: string, options?: any): { exec(): Promise<{ Items?: T[], Count?: number, ScannedCount?: number }> };
    }
}
