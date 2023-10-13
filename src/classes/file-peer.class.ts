
import { Subject } from 'rxjs';
import { IFilePeer } from "../interfaces/file-peer.interface";
import { FileTunnel } from "./file-tunnel.class";

export class FilePeer implements IFilePeer {

    private peer: RTCPeerConnection;

    private Candidates: RTCIceCandidate[] = [];
    private tunnels: { all: FileTunnel<any>[], signal: { self: FileTunnel<any>, pair?: FileTunnel<any> } };

    private onCandidates: Promise<void>;

    public on = {
        tunnel: new Subject<FileTunnel<any>>(),
        signal: new Subject<string>()
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
            const tunnel = new FileTunnel(channel);

            switch(tunnel.label) {
                case 'signal':
                    this.tunnels.signal.pair = tunnel;
                    break;
            }

            this.tunnels.all.push(tunnel);
            this.on.tunnel.next(tunnel);
        }
    }

    public response(method: 'files' | 'read') {
        
    }

    public call(method: 'files' | 'read') {
        const channel = this.peer.createDataChannel(JSON.stringify({ method }));

        return new FileTunnel(channel);
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

    public close(): void {
        this.tunnels.all.forEach((tunnel) => tunnel.close());
        this.peer.close();
    }
}
