import { Subject } from "rxjs";
import { Methods, QueryParams, ResultMethods, SignalMessage } from "../types";


export interface IFilePeer {
    opening: Promise<void>;
    on: {
        query: Subject<SignalMessage>,
        close: Subject<void>
    }
    connect(offer?: RTCSessionDescription): Promise<RTCSessionDescriptionInit | undefined>;
    call<T extends Methods>(method: T, ...params: QueryParams<T>): Promise<ReturnType<ResultMethods<T>>>;
    response<T extends Methods>(uuid: `${string}-${string}-${string}-${string}-${string}`, data: Awaited<ReturnType<ResultMethods<T>>>): void;
    candidates: {
        import: (candidates: RTCIceCandidate | RTCIceCandidate[]) => void,
        export: () => Promise<RTCIceCandidate[]>
    }
    close(): Promise<void> | void;
}