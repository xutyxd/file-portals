
import { IReader, IWriter } from "file-agents";

export type Methods<T> = keyof IReader | keyof IWriter<T>;