
import { IReader, IWriter } from "file-agents";

import { QueryParams } from "../types";
import { ResultMethods } from "../types";

export interface IFileTunnel<T extends (keyof IReader | keyof IWriter<ArrayBuffer>)> {
    query(...params: QueryParams<T>): Promise<Awaited<ReturnType<ResultMethods<T>>>>
}
