
import { IReader, IWriter } from "file-agents";

import { QueryParams } from "../types";
import { ResultMethods } from "../types";

export interface IFileTunnel<Y, T extends (keyof IReader | keyof IWriter<Y>)> {
    query(...params: QueryParams<Y, T>): Promise<Awaited<ReturnType<ResultMethods<Y, T>>>>
}
