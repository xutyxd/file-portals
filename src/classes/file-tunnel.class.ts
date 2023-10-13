
import { Subject } from "rxjs";
import { IFileTunnel } from "../interfaces/file-tunnel.interface";

import { IReader, IWriter } from "file-agents";
import { QueryParams, ResultMethods } from "../types";

export class FileTunnel<T extends keyof IReader | keyof IWriter<ArrayBuffer>> implements IFileTunnel<T> {

    public readonly label: string;
    private opened: Promise<void>;

    public on = {
        query: new Subject<QueryParams<T>>(),
        message: new Subject<ReturnType<ResultMethods<T>>>()
    }

    constructor(private channel: RTCDataChannel) {
        this.label = (() => {
            let method = channel.label;
            try {
                ({ method } = JSON.parse(channel.label));
            } catch(e) { }
            return method;
        })();

        this.opened = new Promise<void>((resolve) => {
            channel.onopen = () => resolve();
        });

        channel.onmessage = ({ data }) => {
            console.log('Data onmessage: ', data);
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
                console.log('Sending message: ', result);
                this.on.message.next(result as ReturnType<ResultMethods<T>>);
            } catch(e) {
                console.log('Error sending message: ', e);
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
        console.log('Sending message: ', data);
        await this.opened;
        console.log('Channel opened...');
        this.channel.send(message as string);
    }

    public query(...params: QueryParams<T>) {
        
        return new Promise<Awaited<ReturnType<ResultMethods<T>>>>((resolve) => {
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

    public close() {
        this.channel.close();
    }
}