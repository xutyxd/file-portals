
import { IReader, IWriter } from "file-agents";

import { Methods } from "./methods.type";
import { ReadResult } from "./read-result.type";
import { WriteResult } from "./write-result.type";
import { IFilePortalMethods } from "../interfaces/file-portal-methods.interface";
import { FilePortalResult } from "./file-portal-result.type";

export type ResultMethods<T extends Methods> =  T extends keyof IFilePortalMethods ? FilePortalResult<T> :
                                                T extends keyof IReader ? ReadResult<T> :
                                                T extends keyof IWriter ? WriteResult<T> : void;