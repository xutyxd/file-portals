
import { IReader, IWriter } from "file-agents";

export type Methods = keyof IReader | keyof IWriter;