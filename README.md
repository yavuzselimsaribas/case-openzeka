## Run project locally

1. Clone the repository

```bash
cd openzeka-signaling
npm install
npm start

cd openzeka-electron
npm install
npm start

cd openzeka-vue
npm install
npm run serve

```

This will start the desktop and vue application.

On electron, features are working, however there are problems with the webrtc connections.

There is a signaling server for websocket connections for ice candidates and sdp messages. It is running for sharing data between electron and vue applications.
