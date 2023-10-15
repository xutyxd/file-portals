
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
    get: async (path?: string, name?: string) => {
        const reader = new NodeReader(path);
        const writer = new NodeWriter();

        const peer = new FilePeer();

        const portal = new FilePortal(reader, writer, peer);

        if (name) {
            portal.name = name;
        }

        return { reader, writer, peer, portal };
    },
    connect: async (peerA: IFilePeer, peerB: IFilePeer) => {
        // Get offer
        const offer = await peerA.connect() as RTCSessionDescription;
        // Answer
        const answer = await peerB.connect(offer) as RTCSessionDescription;
        // Reply
        await peerA.connect(answer);

        try {
            // Exchange candidates
            const candidatesA = await peerA.candidates.export();
            peerB.candidates.import(candidatesA);
        } catch(e) {
        }
    }
}
describe('File portal class', () => {
    type mockInstances = { reader: IReader, writer: IWriter, peer: IFilePeer, portal: FilePortal };

    let A: mockInstances;
    let B: mockInstances;

    beforeEach(async () => {
        A = await portal.get(`${assets}/peer-a`, 'A');
        B = await portal.get(`${assets}/peer-b`, 'B');

        await portal.connect(A.peer, B.peer);
    });

    afterEach(async () => {
        const close = ({ peer, portal }: mockInstances) => {
            peer.close();
            portal.shutdown();
        }

        if (!A.portal.opened || !B.portal.opened) {
            await Promise.all([A.portal.opening, B.portal.opening]);
        }

        close(A);
        close(B);
    });
    
    describe('File portal instance', () => {
        it('should instance', async () => {
            const { portal } = A;

            expect(portal).toBeInstanceOf(FilePortal);
        });
    });

    describe('File portal files', () => {
        it('should get files through the portal', async () => {
            const { portal } = A;

            const [ , file ] = await portal.files();

            expect(file.name).toBe('video-b.mp4');
            expect(file.size).toBe(2097084);
        });

        it('should get files reusing file tunnel through the portal', async () => {
            const { portal } = A;

            const files = await portal.files();
            const [ , file ] = await portal.files();
            const [ , fileAgain ] = await portal.files();

            expect(files.length).toBe(2);
            expect(file.name).toBe('video-b.mp4');
            expect(file.size).toBe(2097084);
            expect(fileAgain.name).toBe('video-b.mp4');
            expect(fileAgain.size).toBe(2097084);
        });
    });

    describe('File portal read', () => {
        it('should read file from portal', async () => {

            const { portal } = A;

            const [ { uuid } ] = await portal.files();

            const readed = await portal.read(uuid, { start: 0, end: 10 });
            const text = await readed.text();

            expect(text).toBe('peer-b');
        });

        it('should read file from portal without uuid', async () => {

            const { portal } = A;

            const [ { uuid } ] = await portal.files();

            const readedA = await portal.read(uuid, { start: 0, end: 3 });
            const readedB = await portal.read(uuid, { start: 3, end: 6 });
            const textA = await readedA.text();
            const textB = await readedB.text();

            expect(textA + textB).toBe('peer-b');
        });
    });

    describe('File portal create', () => {
        it('should create a file', async () => {
            const { portal } = A;

            const file = await portal.create({ path: 'assets/files/peer-b', name: 'test.file', size: 6 });

            expect(file).toBeTruthy();
        });
    });

    describe('File portal write', () => {
        it('should write a file', async () => {
            const { portal } = A;

            const file = await portal.create({ path: './assets/files/peer-b', name: 'test.write', size: 6 });
            const text = 'peer-a';
            const blob = new Blob(text.split(''));
            await portal.write(file, blob, 0);
            expect(file).toBeTruthy();
        });
    });

    describe('File portal close', () => {
        it('should close a file', async () => {
            const { portal } = A;

            const file = await portal.create({ path: './assets/files/peer-b', name: 'test.write', size: 6 });
            const text = 'peer-a';
            const blob = new Blob(text.split(''));
            await portal.write(file, blob, 0);
            await portal.close(file);
            expect(file).toBeTruthy();
        });
    });
});
