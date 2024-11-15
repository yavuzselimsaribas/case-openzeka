const { contextBridge, ipcRenderer } = require('electron');


let activeStream = null;
let cameraStream = null;

contextBridge.exposeInMainWorld('electron', {
    ipcRenderer: {
        invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
        on: (channel, listener) => ipcRenderer.on(channel, listener),
        send: (channel, ...args) => ipcRenderer.send(channel, ...args),
    },
    getActiveStreamTracks: () => {
        return activeStream ? activeStream.getTracks() : [];
    },
    getCameraStreamTracks: () => {
        return cameraStream ? cameraStream.getTracks() : [];
    }
});

ipcRenderer.on('get-cameras', async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const cameras = devices.filter(device => device.kind === 'videoinput').map(device => ({
        deviceId: device.deviceId,
        label: device.label || `Camera ${device.deviceId}`,
    }));
    ipcRenderer.send('camera-list', cameras);
});

// Start camera, store stream in `activeStream`, and notify main process
ipcRenderer.on('start-camera', async (event, deviceId) => {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: deviceId } } });
        ipcRenderer.send('camera-stream-started'); // Notify main process that the stream started
    } catch (error) {
        console.error('Error starting camera:', error);
    }
});

// Stop the camera and notify main process
ipcRenderer.on('stop-camera', () => {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop()); // Stop all tracks in the stream
        cameraStream = null;
        ipcRenderer.send('camera-stopped'); // Notify main process that the camera has stopped
    }
});
