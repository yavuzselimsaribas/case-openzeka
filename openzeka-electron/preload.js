// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Signaling
    sendSignalingMessage: (message) => {
        console.log('Preload: Sending signaling message', message);
        ipcRenderer.send('signaling-message', message);
    },
    onSignalingMessage: (callback) => {
        ipcRenderer.on('signaling-message', (event, message) => {
            console.log('Preload: Received signaling message', message);
            callback(message);
        });
    },

    // Remote control
    sendMouseMove: (x, y) => ipcRenderer.send('mouse-move', { x, y }),
    sendMouseDown: (button, x, y) => ipcRenderer.send("mouse-down", { button, x, y }),
    sendMouseUp: (button, x, y) => ipcRenderer.send("mouse-up", { button, x, y }),
    sendMouseClick: (button) => ipcRenderer.send('mouse-click', { button }),
    sendKeyPress: (key, modifiers) => ipcRenderer.send('key-press', { key, modifiers }),
    sendMouseScroll: (x, y) => ipcRenderer.send('mouse-scroll', { x, y }),

    // IPC methods
    send: (channel, data) => ipcRenderer.send(channel, data),
    on: (channel, callback) => ipcRenderer.on(channel, (event, data) => callback(data)),

    // Invoke methods
    invoke: (channel, args) => ipcRenderer.invoke(channel, args),
});
