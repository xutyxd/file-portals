
import { IReader, IWriter } from "file-agents";
import { IFilePortalMethods } from "../interfaces/file-portal-methods.interface";

export type Methods = keyof IFilePortalMethods | keyof IReader | keyof IWriter;