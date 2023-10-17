import { IReader, IWriter } from "file-agents";
import { IFilePortal } from "../interfaces/file-portal.interface";
import { Methods, ResultMethods } from "../types";
import { IFilePeer } from "../interfaces/file-peer.interface";

export class FilePortal implements IFilePortal {

    public name = 'Portal';
    public opened = false;
    public opening: Promise<void>;

    constructor(private reader: IReader,
                private writer: IWriter,
                private peer: IFilePeer) {

        this.opening = peer.opening;

        peer.on.query.subscribe(async ({ uuid, method, data }) => {
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
                this.peer.response(uuid, { error: error.message } as any);
                return;
            }

            this.peer.response(uuid, result);
        });
    }


    public async files(): ReturnType<IReader['files']> {
        return this.peer.call('files');
    }

    public async read(uuid: string, options: { start: number; end: number; }): Promise<Blob> {
        return this.peer.call('read', uuid, options);
    }

    public async create(where: { path?: string | undefined; name: string; size: number; }) {
        return this.peer.call('create', where);
    }

    public async write(uuid: string, data: Blob, position: number): Promise<void> {
        return this.peer.call('write', uuid, data, position);
    }

    public async close(uuid: string) {
        return this.peer.call('close', uuid);
    }

    public async shutdown(): Promise<void> {
        await this.peer.close();
    }
}