import { IReader, IWriter } from "file-agents";
import { IFilePortal } from "../interfaces/file-portal.interface";
import { FilePeer } from "./file-peer.class";
import { FileTunnel } from "./file-tunnel.class";

type Tunnels = { files?: FileTunnel }

export class FilePortal<T> implements IFilePortal<T> {

    private tunnel: { call: Tunnels, response: Tunnels } = {
        call: { },
        response: { }
    }

    constructor(private reader: IReader,
                private writer: IWriter<T>,
                private peer: FilePeer) {
        peer.onTunnel.subscribe(async (tunnel) => {
            console.log('Tunnel created: ', tunnel);

            const method = (() => {
                let method = undefined;
                try {
                    ({ method } = JSON.parse(tunnel.label));
                } catch(e) { }
                return method;
            })();

            if (method === 'files') {
                this.tunnel.response.files = tunnel;

                const files = await this.reader.files();
                console.log('Sending files: ', files);
                tunnel.send(files);
            }
        });
    }


    public files(): ReturnType<IReader['files']> {
        let tunnel = this.tunnel.call.files;

        if (!tunnel) {
            tunnel = this.tunnel.call.files = this.peer.call('files');
        }
        console.log('Tunnel: ', tunnel);
        // await peer opened
        return tunnel.query<Awaited<ReturnType<IReader['files']>>>();
    }

    public close(): void {
        this.peer.close();
    }
}