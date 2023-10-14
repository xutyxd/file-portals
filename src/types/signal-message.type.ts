import { QueryParams } from "./query-params.type"

export type SignalMessage<T> = {
    method: 'read', data: QueryParams<T, 'read'>
} | {
    method: 'files', data: QueryParams<T, 'files'>
} | {
    method: 'write', data: QueryParams<T, 'write'>
} | {
    method: 'close', data: QueryParams<T, 'close'>
}