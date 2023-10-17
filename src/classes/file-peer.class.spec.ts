
// @ts-ignore
import * as wrtc from 'wrtc';
import { FilePeer } from './file-peer.class';
import { FileTunnel } from './file-tunnel.class';
import { IFilePeer } from '../interfaces/file-peer.interface';

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

    let peer: FilePeer;

    const get = (configuration?: typeof servers) => {
        return peer = new FilePeer(configuration);
    }

    afterEach(async () => {
        await peer.close();
    });

    describe('File peer instance', () => {
        it('should instance', () => {
            const filePeer = get();

            expect(filePeer).toBeInstanceOf(FilePeer);
        });

        it('should instance with configuration', () => {
            const filePeer = get(servers);

            expect(filePeer).toBeInstanceOf(FilePeer);
        });
    });
});