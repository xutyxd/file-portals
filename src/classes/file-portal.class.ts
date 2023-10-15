import { IReader, IWriter } from "file-agents";
import { IFilePortal } from "../interfaces/file-portal.interface";
import { Methods, ResultMethods } from "../types";
import { IFilePeer } from "../interfaces/file-peer.interface";
import { IFileTunnel } from "../interfaces/file-tunnel.interface";

// type Tunnels = { signal?: FileTunnel, files?: FileTunnel, read?: FileTunnel };

export class FilePortal<T> implements IFilePortal<T> {

    private tunnel = {
        get: (label: Methods<T>, type: 'call' | 'response') => {
            let tunnel = this.tunnel[type].find((tunnel) => tunnel.label === label);

            if (!tunnel) {
                tunnel = this.peer[type](label) as IFileTunnel<T, any>;
                this.tunnel[type].push(tunnel);
            }

            return tunnel;
        },
        call: [ ] as IFileTunnel<T, any>[],
        response: [ ] as IFileTunnel<T, any>[]
    }

    public name = 'Portal';
    public opened = false;
    public opening: Promise<void>;

    constructor(private reader: IReader,
                private writer: IWriter<T>,
                private peer: IFilePeer<T>) {
        this.opening = peer.opening.then(() => { this.opened = true });
        peer.on.tunnel.subscribe(async (tunnel) => {
            const method = tunnel.label;

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
        const tunnel = this.tunnel.get('files', 'call') as IFileTunnel<T, 'files'>;

        return tunnel.query();
    }

    public async read(options: { start: number; end: number; }, file?: string | undefined): Promise<Blob> {
        const tunnel = this.tunnel.get('read', 'call') as IFileTunnel<T, 'read'>;
        
        return tunnel.query(options, file);
    }

    public write(data: T, position: number, where?: { path?: string, name: string }): void | Promise<void> {
        const tunnel = this.tunnel.get('write', 'call') as IFileTunnel<T, 'write'>;

        return tunnel.query(data, position, where);
    }

    public close(where?: { path?: string, name: string }) {
        const tunnel = this.tunnel.get('write', 'call') as IFileTunnel<T, 'close'>;

        return tunnel.query(where);
    }

    public async shutdown(): Promise<void> {
        await this.peer.close();
    }
}