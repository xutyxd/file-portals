

export interface IFilePeer {
    connect(offer?: RTCSessionDescription): Promise<RTCSessionDescriptionInit | undefined>;
}