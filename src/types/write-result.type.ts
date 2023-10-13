
import { IWriter } from "file-agents";

export type WriteResult<T extends keyof IWriter<Blob>> = IWriter<Blob>[T];