
import { IReader, IWriter } from "file-agents";
import { Subject } from "rxjs";

import { ResultMethods, QueryParams } from "../types";

export interface IFileTunnel<T extends (keyof IReader | keyof IWriter)> {
    readonly label: `${string}-${string}-${string}-${string}-${string}`;
    opened: boolean;
    opening: Promise<void>;
    on: {
        query: Subject<{ method: T, params: QueryParams<T>}>,
        error: Subject<string>,
        message: Subject<ReturnType<ResultMethods<T>>>
    }
    wait(toWait: () => any): void;
    toWait: number;
    locked: boolean;
    lock: () => void;
    free: () => void;
    send(data: Blob | string | ArrayBuffer | Object): Promise<void>
    query(method: T, ...params: QueryParams<T>): Promise<Awaited<ReturnType<ResultMethods<T>>>>
    close(): Promise<void> | void;
}
