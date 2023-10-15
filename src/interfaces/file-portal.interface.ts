import { IReader, IWriter } from "file-agents";

export interface IFilePortal extends IReader, IWriter {
    opened: boolean;
    opening: Promise<void>;
    shutdown(): Promise<void> | void;
}