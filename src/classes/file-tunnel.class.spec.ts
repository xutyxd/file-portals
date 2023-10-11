
// @ts-ignore
import * as wrtc from 'wrtc';
import { FileTunnel } from "./file-tunnel.class";

Object.assign(globalThis, wrtc);

describe('File tunnel class', () => {
    describe('File tunnel instance', () => {
        it('should instance', () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const fileTunnel = new FileTunnel(channel);

            expect(fileTunnel).toBeInstanceOf(FileTunnel);
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
        });

        it('should set label on instance', () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const fileTunnel = new FileTunnel(channel);

            expect(fileTunnel.label).toBe('channel');
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
        });

        it('should set a promise to wait channel to be opened', () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const fileTunnel = new FileTunnel(channel);

            expect(channel.onopen).toBeInstanceOf(Function);
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
        });

        it('should resolve opened promise when channel is opened', async () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const fileTunnel = new FileTunnel(channel);

            const opened = fileTunnel['opened'];
            const resolved = await new Promise((resolve) => {
                opened.then(() => resolve(true))
                      .catch(() => resolve(false));
                channel.onopen && channel.onopen({ } as Event);
            });

            expect(resolved).toBe(true);
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
        });

        it('should handle querys', async () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const fileTunnel = new FileTunnel(channel);

            const query = new Promise((resolve) => {
                fileTunnel.on.query.subscribe(resolve);

                channel.onmessage && channel.onmessage({ data: 'query' } as MessageEvent);
            });

            expect.assertions(1);
            expect(query).resolves.not.toThrow();
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
        });

        it('should handle messages', async () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const fileTunnel = new FileTunnel(channel);

            const message = await new Promise((resolve) => {
                fileTunnel.on.message.subscribe(resolve);

                channel.onmessage && channel.onmessage({ data: 'test' } as MessageEvent);
            });

            expect(message).toBe('test');
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
        });
    });

    describe('File tunnel send', () => {
        it('should send data as string', async () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const send = jest.fn();
            channel.send = send;

            const fileTunnel = new FileTunnel(channel);

            fileTunnel.send('data');
            channel.onopen && channel.onopen({ } as Event);
            
            await fileTunnel['opened'];

            expect(send).toBeCalledTimes(1);
            expect(send).toBeCalledWith('data');
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
        });

        it('should send data as object', async () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const send = jest.fn();
            channel.send = send;

            const fileTunnel = new FileTunnel(channel);

            fileTunnel.send({ test: 'data' });
            channel.onopen && channel.onopen({ } as Event);

            await fileTunnel['opened'];

            expect(send).toBeCalledTimes(1);
            expect(send).toBeCalledWith(JSON.stringify({ test: 'data' }));
            fileTunnel.close();
            peer.close();
            console.log('Tunnel closed!');
            console.log('Tunnel closed!');
        });
    });

    describe.skip('File tunnel query', () => {
        it('should query data', () => {
            const peer = new RTCPeerConnection();
            const channel = peer.createDataChannel('channel');

            const send = jest.fn();
            channel.send = send;

            const fileTunnel = new FileTunnel(channel);
        });
    });
});