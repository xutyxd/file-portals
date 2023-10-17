import { QueryParams } from "./query-params.type"

export type SignalMessage = {
    uuid: `${string}-${string}-${string}-${string}-${string}`, method: 'read', data: QueryParams<'read'>
} | {
    uuid: `${string}-${string}-${string}-${string}-${string}`, method: 'files', data: QueryParams<'files'>
} | {
    uuid: `${string}-${string}-${string}-${string}-${string}`, method: 'create', data: QueryParams<'create'>
} | {
    uuid: `${string}-${string}-${string}-${string}-${string}`, method: 'write', data: QueryParams<'write'>
} | {
    uuid: `${string}-${string}-${string}-${string}-${string}`, method: 'close', data: QueryParams<'close'>
}