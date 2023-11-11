
import { Subject } from 'rxjs';
import { IFilePeer } from "../interfaces/file-peer.interface";
import { FileTunnel } from "./file-tunnel.class";
import { Methods, QueryParams, ResultMethods, SignalMessage } from '../types';
import { IFileTunnel } from '../interfaces/file-tunnel.interface';

export class FilePeer implements IFilePeer {

    private peer: RTCPeerConnection;

    private Candidates: RTCIceCandidate[] = [];
    private tunnels = {
        call: [] as IFileTunnel<any>[],
        response: [] as IFileTunnel<any>[],
        get: () => {
            const tunnels = [ ...this.tunnels.call ];

            // First find one free
            let tunnel = tunnels.find((tunnel) => !tunnel.locked);
            // Else find next with less waiting list
            if (!tunnel) {
                [ tunnel ] = tunnels.sort((a, b) => a.toWait - b.toWait);
            }

            let result: IFileTunnel<any> | Promise<IFileTunnel<any>> = tunnel;

            if (tunnel.locked) {
                result = new Promise<IFileTunnel<any>>((resolve) => {
                    (tunnel as IFileTunnel<any>).wait(() => resolve(tunnel as IFileTunnel<any>));
                });
            }

            return result;
        }
    };

    private onCandidates: Promise<void>;

    public opening: Promise<void>;
    public on = {
        query: new Subject<SignalMessage>(),
        close: new Subject<void>()
    }

    constructor(config?: RTCConfiguration,
                pool: number = 128) {
        const peer = new RTCPeerConnection(config);

        this.peer = peer;

        this.onCandidates = new Promise((resolve) => {
            // Handle ice candidates to export after conection
            peer.onicecandidate = ({ candidate }) => {
                candidate && this.Candidates.push(candidate) && resolve();
            }
        });

        const MAX_TUNNEL_POOL = pool;
        let max = MAX_TUNNEL_POOL;

        while(max--) {
            try {
                const channel = peer.createDataChannel(crypto.randomUUID());
                const tunnel = new FileTunnel<any>(channel);
                this.tunnels.call.push(tunnel);
            } catch(e) {
                console.info('Reached max tunnel size in: ', max);
                break;
            }
        }

        this.opening = new Promise((resolve) => {
            this.peer.onconnectionstatechange = () => {

                switch (this.peer.connectionState) {
                    case "new":
                    case "connecting":
                      break;
                    case "connected":
                        resolve();
                      break;
                    case "failed":
                    case "disconnected":
                    case "closed":
                        this.on.close.next();
                      break;
                    default:
                      break;
                  }
            }
        });

        // Handle channels
        peer.ondatachannel = (event) => {
            if (!event.channel) {
                return;
            }
            
            const { channel } = event;
            const tunnel = new FileTunnel<any>(channel);
            
            tunnel.on.query.subscribe((data) => {
                const { method, params } = data as any;
                this.on.query.next({ uuid: tunnel.label, method, data: params });
            });

            this.tunnels.response.push(tunnel);
        }
    }

    public response<T extends Methods>(uuid: string, data: Awaited<ReturnType<ResultMethods<T>>>) {
        const tunnel = this.tunnels.response.find(({ label }) => label === uuid);

        if (!tunnel) {
            return;
        }

        tunnel.send(data || { });
    }

    public async call<T extends Methods>(method: T, ...params: QueryParams<T>) {

        let tunnel = this.tunnels.get();

        if (tunnel instanceof FileTunnel) {
            tunnel.lock();
        }

        if (tunnel instanceof Promise) {
            tunnel = await tunnel;
            tunnel.lock();
        }

        let response: ReturnType<ResultMethods<T>>;
        try {
            response = await tunnel.query.apply(tunnel, [method, ...params]);
        } catch(e) {
            throw e;
        } finally {
            tunnel.free();
        }
        
        return response;
    }

    private async offer() {
        const description = await this.peer.createOffer();
        await this.peer.setLocalDescription(description);

        return description;
    }

    private async answer() {
        const answer = await this.peer.createAnswer();
        await this.peer.setLocalDescription(answer);

        return answer;
    }

    public async connect(offer?: RTCSessionDescription) {
        let description: RTCSessionDescriptionInit | undefined;

        if (!offer) {
            description = await this.offer();
        } else {
            await this.peer.setRemoteDescription(new RTCSessionDescription(offer));

            if (offer.type === 'offer') {
                description = await this.answer();
            }
        }

        return description;
    }

    public candidates = {
        import: (candidates: RTCIceCandidate | RTCIceCandidate[]) => {
            ([] as RTCIceCandidate[]).concat(candidates).forEach((candidate) => this.peer.addIceCandidate(candidate));
        },
        export: async () => {
            await this.onCandidates;
            return [ ...this.Candidates ];
        }
    }

    public async close(): Promise<void> {
        const tunnels = [ ...this.tunnels.call, ...this.tunnels.response ];
        await Promise.all(tunnels.map((tunnel) => tunnel.close()));

        this.peer.close();

        this.on.close.next();
    }
}

