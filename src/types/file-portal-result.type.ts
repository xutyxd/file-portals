import { IFilePortalMethods } from "../interfaces/file-portal-methods.interface";

export type FilePortalResult<T extends keyof IFilePortalMethods> = IFilePortalMethods[T];