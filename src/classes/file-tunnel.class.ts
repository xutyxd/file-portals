
import { Subject } from "rxjs";

export class FileTunnel {

    public readonly label: string;
    private opened: Promise<void>;

    public on = {
        query: new Subject<void>(),
        message: new Subject<any>()
    }

    constructor(private channel: RTCDataChannel) {
        this.label = channel.label;

        this.opened = new Promise<void>((resolve) => {
            channel.onopen = () => resolve();
        });

        channel.onmessage = ({ data }) => {
            if (data === 'query') {
                return this.on.query.next();
            }

            this.on.message.next(data);
        }
    }

    public async send(data: string | object) {

        if (typeof data === 'object') {
            data = JSON.stringify(data);
        }

        await this.opened;

        this.channel.send(data);
    }

    public query<T>() {
        return new Promise<T>((resolve) => {
            const subscription = this.on.message.subscribe((data) => {

                const message = (() => {
                    let message = data;

                    try {
                        message = JSON.parse(message);
                    } catch { }

                    return message;
                })();

                resolve(message);

                subscription.unsubscribe();
            });
        });
    }

    public close() {
        this.channel.close();
    }
}