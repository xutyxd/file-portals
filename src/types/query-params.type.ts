
import { Methods } from "./methods.type";
import { ResultMethods } from "./result-methods.type";

export type QueryParams<T extends Methods> = Parameters<ResultMethods<T>> extends [] ? [] : Parameters<ResultMethods<T>>