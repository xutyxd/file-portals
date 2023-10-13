import { IReader, IWriter } from "file-agents";
import { IFilePortal } from "../interfaces/file-portal.interface";
import { FilePeer } from "./file-peer.class";
import { FileTunnel } from "./file-tunnel.class";

// type Tunnels = { signal?: FileTunnel, files?: FileTunnel, read?: FileTunnel };

export class FilePortal<T> implements IFilePortal<T> {

    private tunnel: { get: (label: string, type: 'call' | 'response') => FileTunnel<any>, call: FileTunnel<any>[], response: FileTunnel<any>[] } = {
        get: (label: string, type: 'call' | 'response') => {

            console.log('Trying to get tunnel for label: ', label);
            let tunnel = this.tunnel[type].find((tunnel) => tunnel.label === label);

            const labels = this.tunnel[type].map(({ label }) => label);
            console.log('Tunnel labels: ', labels);
            if (!tunnel) {
                tunnel = this.peer[type](label as 'files' | 'read') as FileTunnel<any>;
                this.tunnel[type].push(tunnel);
            }

            return tunnel;
        },
        call: [ ],
        response: [ ]
    }

    public name = 'Portal';

    constructor(private reader: IReader,
                private writer: IWriter<T>,
                private peer: FilePeer) {
        peer.on.tunnel.subscribe(async (tunnel) => {
            const method = tunnel.label;

            console.log(`Tunnel on ${this.name} added with label: `, tunnel.label);

            if (method === 'signal') {
                this.tunnel.call.push(tunnel);
            }

            if (method === 'files') {
                this.tunnel.response.push(tunnel);
                const filesTunnel = tunnel as FileTunnel<'files'>;
                filesTunnel.on.query.subscribe(async (data) => {
                    const files = await this.reader.files.apply(this.reader, data);

                    filesTunnel.send(files);
                });
            }

            if (method === 'read') {
                this.tunnel.response.push(tunnel);
                const readTunnel = tunnel as FileTunnel<'read'>;
                readTunnel.on.query.subscribe(async (data) => {
                    const readed = await this.reader.read.apply(this.reader, data);

                    readTunnel.send(readed);
                });
            }
        });

        peer.on.signal.subscribe(async (signal) => {
            if (signal === 'files') {
                const tunnel = this.tunnel.get('files', 'response');
                const files = await this.reader.files();
                tunnel.send(files);
            }
        });
    }

    public async files(): ReturnType<IReader['files']> {
        const tunnel = this.tunnel.get('files', 'call') as FileTunnel<'files'>;

        return tunnel.query();
    }

    public async read(options: { start: number; end: number; }, file?: string | undefined): Promise<Blob> {
        const tunnel = this.tunnel.get('read', 'call') as FileTunnel<'read'>;

        return tunnel.query(options, file);
    }

    public write(data: T, position: number): void | Promise<void> {
        return;
    }

    // public read(): ReturnType<IReader['read']> {
    //     const tunnel = this.tunnel.get('read', 'call');

    //     // await 

    // }

    public close(): void {
        this.peer.close();
    }
}