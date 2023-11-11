import { IReader, IWriter } from "file-agents";
import { IFilePortalMethods } from "./file-portal-methods.interface";

export interface IFilePortal extends IFilePortalMethods, IReader, IWriter {
    opened: boolean;
    opening: Promise<void>;
    shutdown(): Promise<void>;
}