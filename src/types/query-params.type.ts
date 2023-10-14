
import { Methods } from "./methods.type";
import { ResultMethods } from "./result-methods.type";

export type QueryParams<Y, T extends Methods<Y>> = Parameters<ResultMethods<Y, T>> extends [] ? [] : Parameters<ResultMethods<Y, T>>