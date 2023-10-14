
import { IReader, IWriter, NodeReader, NodeWriter } from 'file-agents';
import { FilePortal } from './file-portal.class';
import { FilePeer } from './file-peer.class';
// @ts-ignore
import * as wrtc from 'wrtc';
import { IFilePeer } from '../interfaces/file-peer.interface';

Object.assign(globalThis, wrtc);

const assets = './assets/files';
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

const portal = {
    get: (file: string, path?: string, name?: string) => {
        const reader = new NodeReader(path);
        const writer = new NodeWriter({ name: file });

        const peer = new FilePeer<Buffer>();

        const portal = new FilePortal(reader, writer, peer);

        if (name) {
            portal.name = name;
        }

        return { reader, writer, peer, portal };
    }
}
describe('File portal class', () => {
    type mockInstances = { reader: IReader, writer: IWriter<Buffer>, peer: IFilePeer<Buffer>, portal: FilePortal<Buffer> };

    let A: mockInstances;
    let B: mockInstances;

    beforeEach(() => {
        A = portal.get('test', assets, 'A');
        B = portal.get('test', assets, 'B');
    });

    afterEach(() => {
        const close = ({ peer, portal }: mockInstances) => {
            peer.close();
            portal.shutdown();
        }

        close(A);
        close(B);
    });
    
    describe('File portal instance', () => {
        it('should instance', () => {
            const { portal } = A;

            expect(portal).toBeInstanceOf(FilePortal);
        });
    });

    describe('File portal files', () => {
        it('should get files through the portal', async () => {
            const { portal: portalA, peer: peerA } = A;
            const { portal: portalB, peer: peerB } = B;
            // Get offer
            const offer = await peerA.connect() as RTCSessionDescription;
            // Answer
            const answer = await peerB.connect(offer) as RTCSessionDescription;
            // Reply
            await peerA.connect(answer);
            // Exchange candidates
            const candidatesA = await peerA.candidates.export();
            peerB.candidates.import(candidatesA);

            const [ file ] = await portalA.files();

            expect(file.name).toBe('video.mp4');
            expect(file.size).toBe(2097084);
        });

        it('should get files reusing file tunnel through the portal', async () => {
            const { portal: portalA, peer: peerA } = A;
            const { portal: portalB, peer: peerB } = B;
            // Get offer
            const offer = await peerA.connect() as RTCSessionDescription;
            // Answer
            const answer = await peerB.connect(offer) as RTCSessionDescription;
            // Reply
            await peerA.connect(answer);
            // Exchange candidates
            const candidatesA = await peerA.candidates.export();
            peerB.candidates.import(candidatesA);
            const files = await portalA.files();
            const [ file ] = await portalA.files();
            const [ fileAgain ] = await portalA.files();

            expect(files.length).toBe(1);
            expect(file.name).toBe('video.mp4');
            expect(file.size).toBe(2097084);
            expect(fileAgain.name).toBe('video.mp4');
            expect(fileAgain.size).toBe(2097084);
        });
    });
});
