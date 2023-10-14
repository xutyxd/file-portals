import { Subject } from "rxjs";
import { Methods, ResultMethods, SignalMessage } from "../types";
import { IFileTunnel } from "./file-tunnel.interface";


export interface IFilePeer<T> {
    on: {
        tunnel: Subject<IFileTunnel<T, any>>,
        signal: Subject<SignalMessage<T>>
    }
    connect(offer?: RTCSessionDescription): Promise<RTCSessionDescriptionInit | undefined>;
    call(method: Methods<T>): IFileTunnel<T, Methods<T>>;
    response(method: Methods<T>, data: Awaited<ReturnType<ResultMethods<T, typeof method>>>): void;    
    candidates: {
        import: (candidates: RTCIceCandidate | RTCIceCandidate[]) => void,
        export: () => Promise<RTCIceCandidate[]>
    }
    close(): Promise<void> | void;
}