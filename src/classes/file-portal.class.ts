import { IReader, IWriter } from "file-agents";
import { IFilePortal } from "../interfaces/file-portal.interface";
import { Methods, ResultMethods } from "../types";
import { IFilePeer } from "../interfaces/file-peer.interface";
import { Subject } from "rxjs";

export class FilePortal implements IFilePortal {

    private Destination?: { name: string, type: 'server' | 'client' };

    public name = 'Portal';
    public type: 'server' | 'client' = 'client';
    public opened = false;
    public opening: Promise<void>;

    public get destination() {
        return { ...this.Destination };
    }

    public on = {
        files: new Subject<{ resolve: () => void, reject: () => void }>(),
        close: new Subject<void>()
    }

    constructor(private reader: IReader,
                private writer: IWriter,
                private peer: IFilePeer,
                miscellaneous?: { name: string, type: FilePortal['type'] }) {

        if (miscellaneous) {
            const { name, type } = miscellaneous;
            this.name = name;
            this.type = type;
        }

        peer.on.close.subscribe(() => this.on.close.next());

        peer.on.query.subscribe(async ({ uuid, method, data }) => {
            let result: Awaited<ReturnType<ResultMethods<typeof method>>>;

            try {
                switch (method) {
                    case 'information': 
                        result = { name: this.name, type: this.type };
                        break;
                    case 'files':
                        if (this.type === 'client') {
                            try {
                                await new Promise<void>((resolve, reject) => {
                                    this.on.files.next({ resolve, reject });
                                });
                            } catch {
                                throw new Error('Peer rejected to share files');
                            }
                        }

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
                    case 'shutdown':
                        result = await this.shutdown();
                }
            } catch(e) {
                console.log('Error: ', e);
                const error = e as Error;
                this.peer.response(uuid, { type: 'error', message: error.message } as any);
                return;
            }

            this.peer.response(uuid, result);
        });

        this.opening = new Promise(async (resolve) => {
            await peer.opening;
            this.Destination = await this.information();

            this.opened = true;
            resolve();
        });
    }

    public async information() {
        return await this.peer.call('information');
    }

    public async files(): ReturnType<IReader['files']> {
        if (!this.opened) {
            await this.opening;
        }

        return this.peer.call('files');
    }

    public async read(uuid: string, options: { start: number; end: number; }): Promise<Blob> {
        if (!this.opened) {
            await this.opening;
        }

        return this.peer.call('read', uuid, options);
    }

    public async create(where: { path?: string | undefined; name: string; size: number; }) {
        if (!this.opened) {
            await this.opening;
        }
        
        return this.peer.call('create', where);
    }

    public async write(uuid: string, data: Blob, position: number): Promise<void> {
        if (!this.opened) {
            await this.opening;
        }

        return this.peer.call('write', uuid, data, position);
    }

    public async close(uuid: string) {
        if (!this.opened) {
            await this.opening;
        }

        return this.peer.call('close', uuid);
    }

    public async shutdown(): Promise<void> {
        try {
            await this.peer.call('shutdown');
            return this.peer.close();
        } catch { }
    }
}