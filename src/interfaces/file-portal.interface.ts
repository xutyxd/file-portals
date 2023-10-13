import { IReader, IWriter } from "file-agents";

export interface IFilePortal<T> extends IReader, IWriter<T> {
}