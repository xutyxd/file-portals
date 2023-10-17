import { QueryParams } from "./query-params.type"

export type SignalMessage = {
    uuid: string, method: 'read', data: QueryParams<'read'>
} | {
    uuid: string, method: 'files', data: QueryParams<'files'>
} | {
    uuid: string, method: 'create', data: QueryParams<'create'>
} | {
    uuid: string, method: 'write', data: QueryParams<'write'>
} | {
    uuid: string, method: 'close', data: QueryParams<'close'>
}