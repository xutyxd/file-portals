import { IReader, IWriter } from "file-agents";
import { IFilePortal } from "../interfaces/file-portal.interface";
import { Methods, ResultMethods } from "../types";
import { IFilePeer } from "../interfaces/file-peer.interface";
import { IFileTunnel } from "../interfaces/file-tunnel.interface";

export class FilePortal implements IFilePortal {

    private tunnel = {
        get: (label: Methods, type: 'call' | 'response') => {
            let tunnel = this.tunnel[type].find((tunnel) => tunnel.label === label);

            if (!tunnel) {
                tunnel = this.peer[type](label) as IFileTunnel<any>;
                this.tunnel[type].push(tunnel);
            }

            return tunnel;
        },
        call: [ ] as IFileTunnel<any>[],
        response: [ ] as IFileTunnel<any>[]
    }

    public name = 'Portal';
    public opened = false;
    public opening: Promise<void>;

    constructor(private reader: IReader,
                private writer: IWriter,
                private peer: IFilePeer) {
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

            let result: Awaited<ReturnType<ResultMethods<typeof method>>>;

            try {
                switch (method) {
                    case 'files':
                        result = await this.reader[method].apply(this.reader, data);
                        break;
                    case 'read':
                        result = await this.reader[method].apply(this.reader, data);
                        break;
                    case 'create':
                        result = await this.writer[method].apply(this.writer, data);
                        break;
                    case 'write':
                        // Transform to a Blob again
                        const array: number[] = data[1] as unknown as number[];
                        const uint8Array = new Uint8Array(array);
                        const arrayBuffer = uint8Array.buffer;
                        const blob = new Blob([arrayBuffer]);
                        // Set transformed
                        data[1] = blob;
                        result = await this.writer[method].apply(this.writer, data);
                        break;
                    case 'close':
                        result = await this.writer[method].apply(this.writer, data);
                        break;
                }
            } catch(e) {
                console.log('Error: ', e);
                const error = e as Error;
                this.peer.response('error' as Methods, error.message as any);
                return;
            }

            this.peer.response(method, result);
        });
    }


    public async files(): ReturnType<IReader['files']> {
        const tunnel = this.tunnel.get('files', 'call') as IFileTunnel<'files'>;

        return tunnel.query();
    }

    public async read(uuid: string, options: { start: number; end: number; }): Promise<Blob> {
        const tunnel = this.tunnel.get('read', 'call') as IFileTunnel<'read'>;
        
        return tunnel.query(uuid, options);
    }

    public async create(where: { path?: string | undefined; name: string; size: number; }) {
        const tunnel = this.tunnel.get('create', 'call') as IFileTunnel<'create'>;

        return tunnel.query(where);
    }

    public write(uuid: string, data: Blob, position: number): void | Promise<void> {
        const tunnel = this.tunnel.get('write', 'call') as IFileTunnel<'write'>;

        return tunnel.query(uuid, data, position);
    }

    public close(uuid: string) {
        const tunnel = this.tunnel.get('write', 'call') as IFileTunnel<'close'>;

        return tunnel.query(uuid);
    }

    public async shutdown(): Promise<void> {
        await this.peer.close();
    }
}