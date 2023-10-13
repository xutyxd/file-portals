
import { IReader, IWriter } from "file-agents";

import { Methods } from "./methods.type";
import { ReadResult } from "./result-read.type";
import { WriteResult } from "./write-result.type";

export type ResultMethods<T extends Methods> = T extends keyof IReader ? ReadResult<T> : T extends keyof IWriter<Blob> ? WriteResult<T> : void;