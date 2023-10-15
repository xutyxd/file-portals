import { Subject } from "rxjs";
import { Methods, ResultMethods, SignalMessage } from "../types";
import { IFileTunnel } from "./file-tunnel.interface";


export interface IFilePeer {
    opened: boolean;
    opening: Promise<void>;
    on: {
        tunnel: Subject<IFileTunnel<any>>,
        signal: Subject<SignalMessage>
    }
    connect(offer?: RTCSessionDescription): Promise<RTCSessionDescriptionInit | undefined>;
    call(method: Methods): IFileTunnel<typeof method>;
    response(method: Methods, data: Awaited<ReturnType<ResultMethods<typeof method>>>): void;    
    candidates: {
        import: (candidates: RTCIceCandidate | RTCIceCandidate[]) => void,
        export: () => Promise<RTCIceCandidate[]>
    }
    close(): Promise<void> | void;
}