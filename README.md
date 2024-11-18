## WebRTC Media Streaming Project

This project is an implementation of a WebRTC media streaming application.
The project is divided into 3 main parts:
- **Signaling Server**: A simple WebSocket server that handles the signaling process between the clients.
- **Vue App**:Vue.js application that allows the user to communicate with a remote peer using WebRTC and use the remote desktop's camera and control the screens shared.
- **Electron App**: Electron application that allows Vue App to access the desktop's camera and screen.

App utilizes RTCDataChannel and Websocket in a hybrid way to communicate between peers. The signaling server is used to establish the connection between the peers and the RTCDataChannel is used to send the data between the peers like mouse movements, keyboard inputs.
For media streaming, addTrack() and removeTrack() methods are used to add and remove the tracks from the peer connection.
Connection of peers is established by RTCPeerConnection.


## Installation

[//]: # (Clone the repository)
```bash
git clone
```

[//]: # (Install the dependencies)
```bash
cd openzeka-signaling
npm install
cd ../openzeka-vue
npm install
cd ../openzeka-electron
npm install
```

If you encounter any dependency error in vue app, it is because of the typescript version mismatch between the dependencies. To fix this, you can run the following command:
```bash
npm install --force or npm install --legacy-peer-deps
```

## Usage

[//]: # (Run the signaling server)
```bash
cd openzeka-signaling
npm start
```

[//]: # (Run the Vue app)
```bash
cd openzeka-vue
npm run serve
```

[//]: # (Run the Electron app)
```bash
cd openzeka-electron
npm start
```

### Important Notes

- On ubuntu you need to use X11 for screen sharing. This is the supported platform for screen sharing in the electron which uses desktopCapturer.
- Change the localhost:8080 to the ip address that you want to connect, in all of the applications. Electron's main.js, Vue's src/CameraComponent.vue and src/RemoteDesktopComponent.vue files, and lastly signaling server's server.js file.