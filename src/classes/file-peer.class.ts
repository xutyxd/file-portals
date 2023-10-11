
import { Subject } from 'rxjs';
import { IFilePeer } from "../interfaces/file-peer.interface";
import { FileTunnel } from "./file-tunnel.class";

export class FilePeer implements IFilePeer {

    private type?: 'caller' | 'responder';
    private peer: RTCPeerConnection;

    private Candidates: RTCIceCandidate[] = [];
    private Channels: {
        all: FileTunnel[]
        self?: FileTunnel,
        signal?: FileTunnel,
        file: {
            send?: RTCDataChannel,
            receive?: RTCDataChannel
        }
    } = { all: [], signal: undefined, self: undefined, file: { send: undefined, receive: undefined } };

    private onCandidates: Promise<void>;

    public onTunnel = new Subject<FileTunnel>();

    constructor(config?: RTCConfiguration) {
        console.log('Configuring peer with: ', config);
        const peer = new RTCPeerConnection();

        peer.onconnectionstatechange = (event) => {
            console.log('State changed: ', event);
            console.log('State: ', peer.connectionState);
        }

        this.peer = peer;

        this.onCandidates = new Promise((resolve) => {
            console.log('Configure onicecandidate...');
            // Handle ice candidates to export after conection
            peer.onicecandidate = ({ candidate }) => {
                console.log('Candidate added: ', candidate);
                candidate && this.Candidates.push(candidate) && resolve();
            }
        });

        const self = peer.createDataChannel('self');
        const fileTunnel = new FileTunnel(self);
        this.Channels.self = fileTunnel;
        this.Channels.all.push(fileTunnel);
        // Handle channels
        peer.ondatachannel = (event) => {
            console.log('On channel: ', event);
            if (!event.channel) {
                return;
            }

            const { channel } = event;
            const tunnel = new FileTunnel(channel);
            this.Channels.all.push(tunnel);
            switch(tunnel.label) {
                case 'signal':
                    this.Channels.signal = tunnel;
                    break;
            }

            this.onTunnel.next(tunnel);

            // if (tunnel)
        }

    }
    
    // private channels = {
    //     configure: () => {
    //         // Configure channels for 'caller' and 'responder'
    //         if (this.type === 'caller') {
    //             this.peer.ondatachannel = (event) => {
    //                 const { channel, channel: { label } } = event;
    //                 const channels = [ 'signal', 'send', 'receive' ];

    //                 if (!channels.includes(label)) {
    //                     return;
    //                 }

    //                 if (label === 'signal') {
    //                     this.Channels.signal = channel;
    //                 }

    //                 if (label === 'send') {
    //                     this.Channels.file.send = channel;
    //                 }

    //                 if (label === 'receive') {
    //                     this.Channels.file.receive = channel;
    //                 }

    //                 channel.onmessage = (event) => {
    //                     console.log('Message: ', event.data);
    //                 }
    //             }
    //         }

    //         if (this.type === 'responder') {

    //         }
    //     }
    // }

    public response() {
        
    }

    public call(method: 'files' | 'read') {

        const channel = this.peer.createDataChannel(JSON.stringify({ method }));
        console.log('Channel created: ', channel);
        return new FileTunnel(channel);

        // return new Promise((resolve) => {
        //     const channel = this.peer.createDataChannel(JSON.stringify(call));

        //     channel.onmessage = (event) => {
        //         resolve(event.data);

        //         channel.close();
        //     };
        //     channel.onopen = () => {
        //         if (!data) {
        //             return;
        //         }

        //         channel.send(data as string);
        //     }
        // });
    }

    // public files() {
    //     this.peer.createDataChannel();
    // }
    private async offer() {
        const description = await this.peer.createOffer();

        await this.peer.setLocalDescription(description);

        this.type = 'responder';
        // this.channels.configure();
        return description;
    }

    private async answer() {
        const answer = await this.peer.createAnswer();

        await this.peer.setLocalDescription(answer);

        this.type = 'caller';
        // this.channels.configure();
        return answer;
    }

    public async connect(offer?: RTCSessionDescription) {
        console.log('Offer to set: ', offer);
        let description: RTCSessionDescriptionInit | undefined;

        if (!offer) {
            console.log('Creating offer...');
            description = await this.offer();
        } else {
            await this.peer.setRemoteDescription(new RTCSessionDescription(offer));
            console.log('Remote description setted!');
            if (offer.type === 'offer') {
                description = await this.answer();
                console.log('Offer replyed!');
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
        this.Channels.all.forEach((tunnel) => tunnel.close);
        this.peer.close();
    }
}
