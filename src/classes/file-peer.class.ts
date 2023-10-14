
import { Subject } from 'rxjs';
import { IFilePeer } from "../interfaces/file-peer.interface";
import { FileTunnel } from "./file-tunnel.class";
import { Methods, ResultMethods, SignalMessage } from '../types';
import { IFileTunnel } from '../interfaces/file-tunnel.interface';
import { IReader, IWriter } from 'file-agents';

export class FilePeer<T> implements IFilePeer<T> {

    private peer: RTCPeerConnection;

    private Candidates: RTCIceCandidate[] = [];
    private tunnels: { all: FileTunnel<T, any>[], signal: { self: FileTunnel<T, any>, pair?: FileTunnel<T, any> } };

    private onCandidates: Promise<void>;

    public on = {
        tunnel: new Subject<IFileTunnel<T, any>>(),
        signal: new Subject<SignalMessage<T>>()
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

        const signal = peer.createDataChannel('signal');
        const self = new FileTunnel(signal);

        this.tunnels = {
            all: [ self ],
            signal: { self }
        }

        // Handle channels
        peer.ondatachannel = (event) => {
            if (!event.channel) {
                return;
            }

            const { channel } = event;
            const tunnel = new FileTunnel<T, any>(channel);

            switch(tunnel.label) {
                case 'signal':
                    this.tunnels.signal.pair = tunnel;
                    break;
            }

            tunnel.on.query.subscribe((data) => {
                const params = data as any;
                this.on.signal.next({ method: tunnel.label as Methods<T>, data: params });
            });

            this.tunnels.all.push(tunnel);
            this.on.tunnel.next(tunnel);
            
        }
    }

    public response(method: Methods<T>, data: Awaited<ReturnType<ResultMethods<T, typeof method>>>) {
        const tunnel = this.tunnels.all.find(({ label }) => label === method);

        if (!tunnel || !data) {
            return;
        }

        tunnel.send(data);
    }

    public call(method: Methods<T>) {
        const channel = this.peer.createDataChannel(JSON.stringify({ method }));
        const tunnel = new FileTunnel<T, keyof IReader | keyof IWriter<T>>(channel);

        return tunnel;
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
        await Promise.all(this.tunnels.all.map((tunnel) => tunnel.close()));

        await new Promise<void>((resolve) => {
            this.peer.onconnectionstatechange = () => resolve();
            this.peer.close();
        });
    }
}
