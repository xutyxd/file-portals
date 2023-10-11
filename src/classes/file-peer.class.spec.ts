
// @ts-ignore
import * as wrtc from 'wrtc';
import { FilePeer } from './file-peer.class';

Object.assign(globalThis, wrtc);

const servers = {
    iceServers: [
        {
            urls: [
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302'
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

describe('File peer class', () => {
    describe('File peer instance', () => {
        it('should instance', () => {
            const filePeer = new FilePeer();

            expect(filePeer).toBeInstanceOf(FilePeer);
            filePeer.close();
        });

        it('should instance with configuration', () => {
            const filePeer = new FilePeer(servers);

            expect(filePeer).toBeInstanceOf(FilePeer);
            filePeer.close();
        });
    });
});