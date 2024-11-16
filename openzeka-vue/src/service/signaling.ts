let webRTCClientInstance: WebRTCClient | null = null;

class WebRTCClient {
    signalingServer: WebSocket;
    peerConnection!: RTCPeerConnection;
    localStream: MediaStream | null = null;
    remoteStream: MediaStream | null = null;
    onRemoteStream: ((stream: MediaStream) => void) | null = null;
    onCameraList: ((cameras: Array<{ deviceId: string; label: string }>) => void) | null = null;
    onScreenList: ((screens: Array<{ id: string; name: string }>) => void) | null = null;

    constructor(signalingServerUrl: string) {
        this.signalingServer = new WebSocket(signalingServerUrl);

        this.signalingServer.onmessage = this.handleSignalingMessage.bind(this);
        this.signalingServer.onopen = () => {
            console.log('Connected to signaling server');
        };

        this.createPeerConnection();
    }

    createPeerConnection() {
        this.peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.signalingServer.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
            }
        };

        this.peerConnection.ontrack = (event) => {
            console.log('Received remote track:', event.track);
            if (!this.remoteStream) {
                this.remoteStream = new MediaStream();
                if (this.onRemoteStream) {
                    console.log('Initializing remote stream');
                    this.onRemoteStream(this.remoteStream);
                }
            }
            this.remoteStream.addTrack(event.track);
        };
    }

    async handleSignalingMessage(messageEvent: MessageEvent) {
        const data = JSON.parse(messageEvent.data);
        if (data.type === 'offer') {
            console.log('Received offer with data:', data);
            await this.handleOffer(data.sdp);
        } else if (data.type === 'ice-candidate') {
            if (data.candidate) {
                console.log('Adding ICE candidate:', data.candidate);
                const candidate = new RTCIceCandidate(data.candidate);
                await this.peerConnection.addIceCandidate(candidate);
            }
        } else if (data.type === 'camera-list') {
            if (this.onCameraList) {
                this.onCameraList(data.cameras);
            }
        } else if (data.type === 'screen-list') {
            if (this.onScreenList) {
                this.onScreenList(data.screens);
            }
        }
    }

    async handleOffer(sdp: string) {
        const offer: RTCSessionDescriptionInit = { type: 'offer', sdp }; // Correct type
        await this.peerConnection.setRemoteDescription(offer); // Pass directly without RTCSessionDescription

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);

        this.signalingServer.send(JSON.stringify({ type: 'answer', sdp: this.peerConnection.localDescription?.sdp }));
    }

    requestCameraList() {
        this.signalingServer.send(JSON.stringify({ type: 'get-cameras' }));
    }

    requestScreenList() {
        this.signalingServer.send(JSON.stringify({ type: 'get-screens' }));
    }

    startCamera(deviceId: string) {
        this.signalingServer.send(JSON.stringify({ type: 'start-camera', deviceId }));
    }

    stopCamera() {
        this.signalingServer.send(JSON.stringify({ type: 'stop-camera' }));
    }

    startScreenShare(screenId: string) {
        this.signalingServer.send(JSON.stringify({ type: 'start-screen-share', screenId }));
    }

    stopScreenShare() {
        this.signalingServer.send(JSON.stringify({ type: 'stop-screen-share' }));
    }

    sendMouseMove(x: number, y: number) {
        this.signalingServer.send(JSON.stringify({ type: 'mouse-move', x, y }));
    }

    sendMouseClick(button: string) {
        this.signalingServer.send(JSON.stringify({ type: 'mouse-click', button }));
    }

    sendKeyPress(key: string) {
        this.signalingServer.send(JSON.stringify({ type: 'key-press', key }));
    }
}

export function getWebRTCClient() {
    if (!webRTCClientInstance) {
        webRTCClientInstance = new WebRTCClient('ws://localhost:8080');
    }
    return webRTCClientInstance;
}