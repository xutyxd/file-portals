import { QueryParams } from "./query-params.type"

export type SignalMessage = {
    method: 'read', data: QueryParams<'read'>
} | {
    method: 'files', data: QueryParams<'files'>
} | {
    method: 'create', data: QueryParams<'create'>
} | {
    method: 'write', data: QueryParams<'write'>
} | {
    method: 'close', data: QueryParams<'close'>
}