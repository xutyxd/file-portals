
import { Subject } from 'rxjs';
import { IFilePeer } from "../interfaces/file-peer.interface";
import { FileTunnel } from "./file-tunnel.class";
import { Methods, QueryParams, ResultMethods, SignalMessage } from '../types';
import { IFileTunnel } from '../interfaces/file-tunnel.interface';
import { IReader, IWriter } from 'file-agents';

export class FilePeer /*implements IFilePeer*/ {

    private peer: RTCPeerConnection;

    private Candidates: RTCIceCandidate[] = [];
    private tunnels = {
        call: [] as FileTunnel<any>[],
        response: [] as FileTunnel<any>[],
        get: async () => {
            const tunnels = [ ...this.tunnels.call ];
            const [ tunnel ] = tunnels.sort((a, b) => a.toWait - b.toWait);

            let result: FileTunnel<any> | Promise<FileTunnel<any>> = tunnel;

            if (tunnel.toWait) {
                result = new Promise<FileTunnel<any>>((resolve) => {
                    tunnel.wait(() => resolve(tunnel));
                });
            }

            return result;
        }
    };

    private onCandidates: Promise<void>;

    // public opened = false;
    public opening: Promise<void>;
    public on = {
        tunnel: new Subject<IFileTunnel<any>>(),
        query: new Subject<SignalMessage>()
    }

    constructor(config?: RTCConfiguration) {
        const peer = new RTCPeerConnection(config);

        this.peer = peer;

        this.onCandidates = new Promise((resolve) => {
            // Handle ice candidates to export after conection
            peer.onicecandidate = ({ candidate }) => {
                candidate && this.Candidates.push(candidate) && resolve();
            }
        });

        const MAX_TUNNEL_POOL = 128;
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

        // const signal = peer.createDataChannel('signal');
        this.opening = new Promise((resolve) => {
            this.peer.onconnectionstatechange = () => {
                if (this.peer.connectionState !== 'connected') {
                    return;
                }

                resolve();
            }
        });
        // const self = new FileTunnel(signal);
        // this.opening = self.opening.then(() => { this.opened = true });

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

    public response(uuid: string, method: Methods, data: Awaited<ReturnType<ResultMethods<typeof method>>>) {
        const tunnel = this.tunnels.response.find(({ label }) => label === uuid);

        if (!tunnel) {
            return;
        }

        tunnel.send(data || { });
    }

    public async call<T extends Methods>(method: T, ...params: QueryParams<T>) {

        const tunnel = await this.tunnels.get() as FileTunnel<T>;

        const response = await tunnel.query.apply(tunnel, [method, ...params]);

        return response;
        // const channel = this.peer.createDataChannel(JSON.stringify({ method }));
        // const tunnel = new FileTunnel<keyof IReader | keyof IWriter>(channel);

        // return tunnel;
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

        await new Promise<void>((resolve) => {
            this.peer.onconnectionstatechange = () => resolve();
            this.peer.close();
        });
    }
}

