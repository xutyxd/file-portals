import { IReader, IWriter } from "file-agents";

export interface IFilePortal<T> extends IReader, IWriter<T> {
    opened: boolean;
    opening: Promise<void>;
    shutdown(): Promise<void> | void;
}