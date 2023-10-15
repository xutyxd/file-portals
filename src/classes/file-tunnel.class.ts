
import { Subject } from "rxjs";
import { IFileTunnel } from "../interfaces/file-tunnel.interface";

import { IReader, IWriter } from "file-agents";
import { QueryParams, ResultMethods } from "../types";

export class FileTunnel<Y, T extends keyof IReader | keyof IWriter<ArrayBuffer>> implements IFileTunnel<Y, T> {

    public readonly label: string;
    public opened = false;
    public opening: Promise<void>;

    public on = {
        query: new Subject<QueryParams<Y, T>>(),
        message: new Subject<ReturnType<ResultMethods<Y, T>>>()
    }

    constructor(private channel: RTCDataChannel) {
        this.label = (() => {
            let method = channel.label;
            try {
                ({ method } = JSON.parse(channel.label));
            } catch(e) { }
            return method;
        })();
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
                    const { method, params } = parsed;
    
                    if (method === 'query') {
                        return this.on.query.next(params);
                    }
    
                    result = parsed;
                }
                this.on.message.next(result as ReturnType<ResultMethods<Y, T>>);
            } catch(e) {
            }
        }
    }

    private parse(data: any): { method: string, params: any } {

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

    public query(...params: QueryParams<Y, T>) {
        return new Promise<Awaited<ReturnType<ResultMethods<Y, T>>>>((resolve) => {
            const subscription = this.on.message.subscribe((data) => {
                const message = (() => {
                    let message = data;

                    try {
                        message = JSON.parse(message as unknown as string);
                    } catch { }

                    return message;
                })();

                resolve(message as any);

                subscription.unsubscribe();
            });

            this.send({ method: 'query', params });
        });
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