
import { IWriter } from "file-agents";

export type WriteResult<Y, T extends keyof IWriter<Y>> = IWriter<Y>[T];