const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');
const WebSocket = require('ws');
const robot = require('@jitsi/robotjs');

let mainWindow;
let peerConnection = null;
let screenSharingStream = null;
let screenSharingActive = false;

// WebRTC configuration with STUN server
const rtcConfig = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

// Initialize signaling server connection
const signalingServer = new WebSocket('ws://localhost:8080');

// Function to create the main Electron window
function createWindow() {
    mainWindow = new BrowserWindow({
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            signalingServer.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
        }
    };
}

// Listen for signaling messages from Vue.js
signalingServer.onmessage = async (message) => {
    const data = JSON.parse(message.data);
    console.log('Received signaling message:', data);

    if (data.type === 'get-cameras') {
        mainWindow.webContents.send('get-cameras');
    } else if (data.type === 'start-camera') {
        mainWindow.webContents.send('start-camera', data.deviceId);
    } else if (data.type === 'stop-camera') {
        mainWindow.webContents.send('stop-camera');
    } else if (data.type === 'get-sources') {
        const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
        signalingServer.send(JSON.stringify({ type: 'sources', sources }));
    }
    else if (data.type === 'start-screen-share') {
        await startScreenShare(data.sourceId);
    } else if (data.type === 'offer') {
        createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        signalingServer.send(JSON.stringify({ type: 'answer', answer }));
    } else if (data.type === 'answer' && peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    } else if (data.type === 'ice-candidate' && data.candidate && peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    }
};

// Start screen share
async function startScreenShare(sourceId) {
    const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
    const screenSource = sources.find(source => source.id === sourceId);

    if (!screenSource) {
        console.error('Screen source not found');
        return;
    }

    screenSharingStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: screenSource.id,
            },
        },
    });

    if (peerConnection) {
        screenSharingStream.getVideoTracks().forEach(track => peerConnection.addTrack(track, screenSharingStream));
    }
}


// Notify Vue component when camera stream starts
ipcMain.on('camera-stream-started', async () => {
    const cameraTracks = await mainWindow.webContents.executeJavaScript('electron.getCameraStreamTracks()');
    console.log('Camera stream started with tracks:', cameraTracks);
    if (peerConnection && cameraTracks.length > 0) {
        cameraTracks.forEach(track => peerConnection.addTrack(track));
    }
    signalingServer.send(JSON.stringify({ type: 'camera-stream-started' }));
});

ipcMain.on('camera-stopped', () => {
    signalingServer.send(JSON.stringify({ type: 'camera-stopped' }));
});

ipcMain.on('screen-share-stopped', () => {
    signalingServer.send(JSON.stringify({ type: 'screen-share-stopped' }));
});

// Listen for camera list from renderer process
ipcMain.on('camera-list', (event, cameras) => {
    signalingServer.send(JSON.stringify({ type: 'camera-list', cameras }));
});


// Handle requests for screen sources
ipcMain.handle('get-sources', async () => {
    return await desktopCapturer.getSources({types: ['screen', 'window']});
});

// Event handlers for mouse and keyboard actions
ipcMain.on('mouse-click', (event, { x, y }) => {
    if (!screenSharingActive) return;
    console.log(`Received mouse-click event at (${x}, ${y})`);
    robot.moveMouse(x, y);
    robot.mouseClick();
});

ipcMain.on('mouse-move', (event, { x, y }) => {
    if (!screenSharingActive) return;
    console.log(`Received mouse-move event to (${x}, ${y})`);
    robot.moveMouse(x, y);
});

ipcMain.on('key-press', (event, { key }) => {
    if (!screenSharingActive) return;
    console.log(`Received key-press event: ${key}`);
    robot.keyTap(key);
});


// Handle signaling server connection
signalingServer.onopen = () => {
    console.log('Connected to signaling server');
};



// Handle screen share control events from renderer
ipcMain.on('start-screen-share', () => {
    screenSharingActive = true; // Enable screen sharing mode
    console.log('Screen sharing started');
});

ipcMain.on('stop-screen-share', () => {
    screenSharingActive = false; // Disable screen sharing mode
    console.log('Screen sharing stopped');
});