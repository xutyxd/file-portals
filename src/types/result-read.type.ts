
import { IReader } from "file-agents";

export type ReadResult<T extends keyof IReader> = IReader[T];