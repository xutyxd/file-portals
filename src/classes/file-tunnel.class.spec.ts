
// @ts-ignore
import * as wrtc from 'wrtc';
import { FileTunnel } from "./file-tunnel.class";

Object.assign(globalThis, wrtc);

describe('File tunnel class', () => {

    let peers: RTCPeerConnection[];
    let channels: RTCDataChannel[];
    let peer: RTCPeerConnection;
    let channel: RTCDataChannel;

    beforeEach(() => {
        peer = new RTCPeerConnection();
        channel = peer.createDataChannel('channel');
        peers = [ peer ];
        channels = [ channel ];
    });

    afterEach(async () => {
        channels.forEach((channel) => channel.close());

        peers.forEach((peer) => peer.close());
    });

    describe('File tunnel instance', () => {
        it('should instance', () => {
            const fileTunnel = new FileTunnel(channel);

            expect(fileTunnel).toBeInstanceOf(FileTunnel);
            
        });

        it('should set label on instance', () => {

            const channel = peer.createDataChannel('channel');
            channels.push(channel);
            const fileTunnel = new FileTunnel(channel);

            expect(fileTunnel.label).toBe('channel');
        });

        it('should set a promise to wait channel to be opened', () => {
            new FileTunnel(channel);
            expect(channel.onopen).toBeInstanceOf(Function);
        });

        it('should resolve opened promise when channel is opened', async () => {
            const fileTunnel = new FileTunnel(channel);

            const opening = fileTunnel['opening'];
            const resolved = await new Promise((resolve) => {
                opening.then(() => resolve(true))
                      .catch(() => resolve(false));
                channel.onopen && channel.onopen({ } as Event);
            });

            expect(resolved).toBe(true);
        });

        it('should handle querys', async () => {
            const fileTunnel = new FileTunnel(channel);

            const query = new Promise((resolve) => {
                fileTunnel.on.query.subscribe(resolve);

                channel.onmessage && channel.onmessage({ data: JSON.stringify({ type: 'query' }) } as MessageEvent);
            });

            expect.assertions(1);
            expect(query).resolves.not.toThrow();
        });

        it('should handle messages', async () => {
            const fileTunnel = new FileTunnel(channel);

            const message = await new Promise((resolve) => {
                fileTunnel.on.message.subscribe(resolve);

                channel.onmessage && channel.onmessage({ data: 'test' } as MessageEvent);
            });

            expect(message).toBe('test');
        });
    });

    describe('File tunnel send', () => {
        it('should send data as string', async () => {
            const send = jest.fn();
            channel.send = send;

            const fileTunnel = new FileTunnel(channel);

            fileTunnel.send('data');
            channel.onopen && channel.onopen({ } as Event);
            
            await fileTunnel['opening'];

            expect(send).toBeCalledTimes(1);
            expect(send).toBeCalledWith('data');
        });

        it('should send data as object', async () => {
            const send = jest.fn();
            channel.send = send;

            const fileTunnel = new FileTunnel(channel);

            fileTunnel.send({ test: 'data' });
            channel.onopen && channel.onopen({ } as Event);

            await fileTunnel['opening'];

            expect(send).toBeCalledTimes(1);
            expect(send).toBeCalledWith(JSON.stringify({ test: 'data' }));
        });
    });
});