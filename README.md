# File Portals
File sharing package without the need to use a server.
The objetive is to allow to comunicate servers and webs directly to transfer files.

## Installation

```bash
npm install file-portals
```

## Node configuration

Tested on node 20

To make it work in node, it is necessary to install a package that implements WebRTC.

Examples:
```
npm install wrtc
```

After it, is necessary to set it as global with something similar to this
```js
// @ts-ignore
import * as wrtc from 'wrtc';

Object.assign(globalThis, wrtc);
```

## Usage

First of all you need to create a IFilePeer to connect with other IFilePeer

You have to indicate what type of data will be use to write on filesystem. In this case `Buffer`

### Instanciation
``` ts
const peerA = new FilePeer<Buffer>(); 
const peerB = new FilePeer<Buffer>(); 

```
### Connect peers
``` ts
// Get offer
const offer = await peerA.connect() as RTCSessionDescription;
// Answer
const answer = await peerB.connect(offer) as RTCSessionDescription;
// Reply
await peerA.connect(answer);
```
In a real scenario, you have to exchange offers with a server, mail, QR o another data transport

### Exchange candidates

``` ts
const candidatesA = await peerA.candidates.export();
peerB.candidates.import(candidatesA);
```

In a real scenario, same as offers

### Configure a portal

``` ts
import { IReader, IWriter, NodeReader, NodeWriter } from 'file-agents';

const reader = new NodeReader('path/where/files/will/be/shared');
const writer = new NodeWriter({ name: 'file-to-share' }); // Forget it at this moment
const portal = new FilePortal(reader, writer, peerA);
```

### Getting files from the other portal

``` ts
const files = await portalA.files();
```

### Read from file from the other portal

``` ts
const [{ uuid }] = await portalA.files();
const readed = await portalA.read(uuid, { start: 0, end: 6 });
const text = await readed.text();
```

### Create a writable on the other portal

``` ts
const writable = await portalA.create({ name: 'file.txt', size: 6 });
```

### Write on the file in the other side

```ts
const text = 'text';
const writable = await portalA.create({ name: 'file.txt', size: text.length });

await portalA.write(writable, new Blob(text.split('')), 0);
```

### Close writable

```ts
const text = 'text';
const writable = await portalA.create({ name: 'file.txt', size: text.length });

await portalA.write(writable, new Blob(text.split('')), 0);
await portalA.close(writable);
```