
import { NodeReader, NodeWriter } from 'file-agents';
import { FilePortal } from './file-portal.class';
import { FilePeer } from './file-peer.class';
// @ts-ignore
import * as wrtc from 'wrtc';

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
    get: (file: string, path?: string, ) => {
        const reader = new NodeReader(path);
        const writer = new NodeWriter({ name: file });

        const peer = new FilePeer();

        const portal = new FilePortal(reader, writer, peer);

        return { reader, writer, peer, portal };
    }
}
describe('File portal class', () => {
    // jest.setTimeout(60000);
    describe('File portal instance', () => {
        it('should instance', () => {
            const reader = new NodeReader();
            const writer = new NodeWriter({ name: 'test' });

            const peer = new FilePeer();

            const filePortal = new FilePortal(reader, writer, peer);

            expect(filePortal).toBeInstanceOf(FilePortal);
            filePortal.close();
        });
    });

    describe('File portal files', () => {
        it.only('should get files through the portal', async () => {
            const { portal: portalA, peer: peerA, reader } = portal.get('test', assets);
            const { portal: portalB, peer: peerB } = portal.get('test', assets);
            console.log('A: ', { portalA, peerA });
            console.log('B: ', { portalB, peerB });
            console.log('Files: ', await reader.files());
            // Get offer
            const offer = await peerA.connect() as RTCSessionDescription;
            console.log('Offer: ', offer);
            // Answer
            const answer = await peerB.connect(offer) as RTCSessionDescription;
            console.log('Answer: ', answer);
            // Reply
            await peerA.connect(answer);
            console.log('Connected!');

            console.log('LocalA: ', peerA['peer'].localDescription);
            console.log('RemoteA: ', peerA['peer'].remoteDescription);
            console.log('LocalB: ', peerB['peer'].localDescription);
            console.log('RemoteB: ', peerB['peer'].remoteDescription);

            console.log('Pending A: ', peerA['peer'].pendingRemoteDescription);
            console.log('Pending B: ', peerB['peer'].pendingRemoteDescription);
            const candidatesA = await peerA.candidates.export();
            console.log('CandidatesA: ', candidatesA);
            peerB.candidates.import(candidatesA);
            console.log('Candidates exchanged!');
            console.log('PeerA connected: ', peerA['peer'].connectionState);
            console.log('PeerB connected: ', peerB['peer'].connectionState);
            const [ file ] = await portalA.files();
            console.log('File: ', file);
            expect(file.name).toBe('video.mp4');
            expect(file.size).toBe(2097084);

            portalA.close();
            portalB.close();
        });
    });
});
