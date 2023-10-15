
import { IReader, IWriter } from "file-agents";
import { Subject } from "rxjs";

import { ResultMethods, QueryParams } from "../types";

export interface IFileTunnel<Y, T extends (keyof IReader | keyof IWriter<Y>)> {
    label: string;
    opened: boolean;
    opening: Promise<void>;
    on: {
        query: Subject<QueryParams<Y, T>>,
        message: Subject<ReturnType<ResultMethods<Y, T>>>
    }
    send(data: Blob | string | ArrayBuffer | Object): Promise<void>
    query(...params: QueryParams<Y, T>): Promise<Awaited<ReturnType<ResultMethods<Y, T>>>>
    close(): Promise<void> | void;
}
