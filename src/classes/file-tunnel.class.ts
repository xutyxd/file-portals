
import { Subject } from "rxjs";
import { IFileTunnel } from "../interfaces/file-tunnel.interface";

import { IReader, IWriter } from "file-agents";
import { QueryParams, ResultMethods } from "../types";

export class FileTunnel<T extends keyof IReader | keyof IWriter> implements IFileTunnel<T> {

    public readonly label: `${string}-${string}-${string}-${string}-${string}`;
    public opened = false;
    public opening: Promise<void>;

    public on = {
        query: new Subject<{ method: T, params: QueryParams<T>}>(),
        error: new Subject<string>(),
        message: new Subject<ReturnType<ResultMethods<T>>>()
    }

    private waitingList: (() => void)[] = [];

    public wait(toWait: () => any) {
        this.waitingList.push(toWait);
    }

    public get toWait() {
        return this.waitingList.length;
    }

    private Locked = false;

    public get locked() {
        return this.Locked;
    }
    
    public lock() {
        this.Locked = true;
    }

    public free() {
        this.Locked = false;
    }

    constructor(private channel: RTCDataChannel) {
        this.label = channel.label as `${string}-${string}-${string}-${string}-${string}`;
        // Handle when open
        this.opening = new Promise<void>((resolve) => {
            channel.onopen = () => resolve();
        }).then(() => { this.opened = true });

        channel.onmessage = ({ data }) => {
            try {
                let result;

                if (data instanceof ArrayBuffer) {
                    result = new Blob([ data ]);
                } else {
                    const parsed = this.parse(data);
                    const { type, method, params } = parsed;
    
                    if (type === 'error') {
                        this.on.error.next(params);
                        return;
                    }

                    if (type === 'query') {
                        return this.on.query.next({ method, params });
                    }
    
                    result = parsed;
                }
                this.on.message.next(result as ReturnType<ResultMethods<T>>);
            } catch(e) {
                console.log('Error handling message: ', e);
            }
        }
    }

    private parse(data: any): { type: 'query' | 'error', method: T, params: any } {

        let parsed = data;

        try {
            parsed = JSON.parse(data);
        } catch { }

        return parsed;
    }

    public async send(data: Blob | string | ArrayBuffer | Object) {
        let message: string | ArrayBuffer = data as string;

        if (data instanceof Blob) {
            message = await data.arrayBuffer();
        } else if(typeof data === 'object') {
            message = JSON.stringify(data);
        }
        const opened = this.opened || this.channel.readyState === 'open';

        if (!opened) {
            await this.opening;
        }

        this.channel.send(message as string);
    }

    public query(method: T, ...params: QueryParams<T>) {

        const promise = new Promise<Awaited<ReturnType<ResultMethods<T>>>>(async (resolve, reject) => {
            const onMessage = this.on.message.subscribe((data) => {
                const message = (() => {
                    let message = data;

                    try {
                        message = JSON.parse(message as unknown as string);
                    } catch { }

                    return message;
                })();

                resolve(message as any);

                onMessage.unsubscribe();
                onError.unsubscribe();
            });
            const onError = this.on.error.subscribe((data) => {
                const message = (() => {
                    let message = data;

                    try {
                        message = JSON.parse(message as unknown as string);
                    } catch { }

                    return message;
                })();

                reject(message);
                onMessage.unsubscribe();
                onError.unsubscribe();
            });
            // Clean params
            const cleaned = params.filter((param) => param !== undefined);
            // Transforms Blobs -> ArrayBuffers
            const transformed = await Promise.all(cleaned.map(async (param) => {
                let paramTransformed: any = param;
                if (param instanceof Blob) {
                    const arrayBuffer = await param.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer)
                    const array = [...uint8Array]

                    paramTransformed = array;
                }
                
                return paramTransformed;
            }));
            const opened = this.opened || this.channel.readyState === 'open';

            if (!opened) {
                await this.opening;
            }
            // Send data
            this.channel.send(JSON.stringify({ type: 'query', method, params: transformed }));
            // this.send({ method, params: transformed });
        });

        promise.then(() => {
            const [ resolve ] = this.waitingList.splice(0, 1);

            if (!resolve) {
                return;
            }

            resolve();
        });

        return promise;
    }

    public async close() {
        const closed = new Promise<void>((resolve) => {
            this.channel.onclose = () => resolve();
        });

        this.channel.close();
        this.channel.dispatchEvent(new Event('close'));

        await closed;
    }
}