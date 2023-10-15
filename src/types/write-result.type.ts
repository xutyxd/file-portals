
import { IWriter } from "file-agents";

export type WriteResult<T extends keyof IWriter> = IWriter[T];