
import { IReader, IWriter } from "file-agents";
import { Subject } from "rxjs";

import { ResultMethods, QueryParams } from "../types";

export interface IFileTunnel<T extends (keyof IReader | keyof IWriter)> {
    label: string;
    opened: boolean;
    opening: Promise<void>;
    on: {
        query: Subject<QueryParams<T>>,
        message: Subject<ReturnType<ResultMethods<T>>>
    }
    send(data: Blob | string | ArrayBuffer | Object): Promise<void>
    query(method: T, ...params: QueryParams<T>): Promise<Awaited<ReturnType<ResultMethods<T>>>>
    close(): Promise<void> | void;
}
