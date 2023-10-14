import { IReader, IWriter } from "file-agents";
import { IFilePortal } from "../interfaces/file-portal.interface";
import { FilePeer } from "./file-peer.class";
import { FileTunnel } from "./file-tunnel.class";
import { Methods, ResultMethods } from "../types";

// type Tunnels = { signal?: FileTunnel, files?: FileTunnel, read?: FileTunnel };

export class FilePortal<T> implements IFilePortal<T> {

    private tunnel: { get: (label: Methods<T>, type: 'call' | 'response') => FileTunnel<T, any>, call: FileTunnel<T, any>[], response: FileTunnel<T, any>[] } = {
        get: (label: Methods<T>, type: 'call' | 'response') => {
            console.log('Trying to get tunnel for label: ', label);
            let tunnel = this.tunnel[type].find((tunnel) => tunnel.label === label);

            const labels = this.tunnel[type].map(({ label }) => label);
            console.log('Tunnel labels: ', labels);
            if (!tunnel) {
                tunnel = this.peer[type](label as 'files' | 'read') as FileTunnel<T, any>;
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
                private peer: FilePeer<T>) {
        peer.on.tunnel.subscribe(async (tunnel) => {
            const method = tunnel.label;

            console.log(`Tunnel on ${this.name} added with label: `, tunnel.label);

            if (method === 'signal') {
                this.tunnel.call.push(tunnel);
            }

            if (['files', 'read', 'write', 'close'].includes(method)) {
                this.tunnel.response.push(tunnel);
            }
        });

        peer.on.signal.subscribe(async ({ method, data }) => {

            let result: Awaited<ReturnType<ResultMethods<T, typeof method>>>;

            switch (method) {
                case 'files':
                    result = await this.reader[method].apply(this.reader, data);
                    break;
                case 'read':
                    result = await this.reader[method].apply(this.reader, data);
                    break;
                case 'write':
                    result = await this.writer[method].apply(this.writer, data);
                    break;
                case 'close':
                    result = await this.writer[method].apply(this.writer, data);
                    break;
            }

            this.peer.response(method, result);
        });
    }


    public async files(): ReturnType<IReader['files']> {
        const tunnel = this.tunnel.get('files', 'call') as FileTunnel<T, 'files'>;

        return tunnel.query();
    }

    public async read(options: { start: number; end: number; }, file?: string | undefined): Promise<Blob> {
        const tunnel = this.tunnel.get('read', 'call') as FileTunnel<T, 'read'>;

        return tunnel.query(options, file);
    }

    public write(data: T, position: number, where?: { path?: string, name: string }): void | Promise<void> {
        const tunnel = this.tunnel.get('write', 'call') as FileTunnel<T, 'write'>;

        return tunnel.query(data, position, where);
    }

    public close(where?: { path?: string, name: string }) {
        const tunnel = this.tunnel.get('write', 'call') as FileTunnel<T, 'close'>;

        return tunnel.query(where);
    }

    // public read(): ReturnType<IReader['read']> {
    //     const tunnel = this.tunnel.get('read', 'call');

    //     // await 

    // }

    // public close(): void {
    //     this.peer.close();
    // }
}