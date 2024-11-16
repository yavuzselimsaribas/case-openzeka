// renderer.js

(async function() {
    let peerConnection = null;
    let localStream = null;
    const configuration = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

    function initPeerConnection() {
        peerConnection = new RTCPeerConnection(configuration);

        peerConnection.onicecandidate = ({ candidate }) => {
            if (candidate) {
                console.log('Sending ICE candidate from renderer to main:', candidate);
                // Serialize the ICE candidate to send through IPC
                const candidateObject = {
                    candidate: candidate.candidate,
                    sdpMLineIndex: candidate.sdpMLineIndex,
                    sdpMid: candidate.sdpMid,
                    usernameFragment: candidate.usernameFragment,
                };
                window.electronAPI.sendSignalingMessage({ type: 'ice-candidate', candidate: candidateObject });
            }
        };

        peerConnection.onconnectionstatechange = () => {
            console.log('Peer connection state:', peerConnection.connectionState);
        };
    }

    async function getCameraList() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter(device => device.kind === 'videoinput').map(device => ({
            deviceId: device.deviceId,
            label: device.label || `Camera ${device.deviceId}`,
        }));
        window.electronAPI.sendSignalingMessage({ type: 'camera-list', cameras });
    }

    async function getScreenList() {
        const sources = await window.electronAPI.invoke('get-sources');
        const screens = sources.map(source => ({
            id: source.id,
            name: source.name,
        }));
        window.electronAPI.sendSignalingMessage({ type: 'screen-list', screens });
    }

    async function startCamera(deviceId) {
        try {
            localStream = await navigator.mediaDevices.getUserMedia({
                video: { deviceId: { exact: deviceId } },
                audio: false,
            });

            initPeerConnection();

            localStream.getTracks().forEach((track) => {
                console.log('Adding track to peer connection:', track);
                peerConnection.addTrack(track, localStream);
            });

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            console.log('Sending offer:', peerConnection.localDescription);
            window.electronAPI.sendSignalingMessage({
                type: 'offer',
                sdp: peerConnection.localDescription.sdp
            });
        } catch (error) {
            console.error('Error starting camera:', error);
        }
    }

    async function stopCamera() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    }

    async function startScreenShare(screenId) {
        try {
            const sources = await window.electronAPI.invoke('get-sources');
            const source = sources.find(s => s.id === screenId);
            if (!source) {
                console.error('Screen source not found');
                return;
            }

            localStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: source.id,
                    },
                },
            });

            initPeerConnection();

            localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));

            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);

            window.electronAPI.sendSignalingMessage({
                type: 'offer',
                sdp: peerConnection.localDescription.sdp
            });
        } catch (error) {
            console.error('Error starting screen share:', error);
        }
    }

    async function stopScreenShare() {
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
            localStream = null;
        }
        if (peerConnection) {
            peerConnection.close();
            peerConnection = null;
        }
    }

    async function handleSignalingMessage(data) {
        if (data.type === 'get-cameras') {
            await getCameraList();
        } else if (data.type === 'get-screens') {
            await getScreenList();
        } else if (data.type === 'start-camera') {
            await startCamera(data.deviceId);
        } else if (data.type === 'stop-camera') {
            await stopCamera();
        } else if (data.type === 'start-screen-share') {
            await startScreenShare(data.screenId);
        } else if (data.type === 'stop-screen-share') {
            await stopScreenShare();
        } else if (data.type === 'answer') {
            if (peerConnection) {
                try {
                    console.log('Received answer:', data.sdp);
                    //create RTCSessionDescriptionInit object from received sdp
                    //and set it as remote description
                    const answerDescription = {
                        type: 'answer',
                        sdp: data.sdp,
                    };

                    console.log('Peer connection state in answer part:', peerConnection.signalingState);

                    if (peerConnection.signalingState === 'have-local-offer') {
                        await peerConnection.setRemoteDescription(new RTCSessionDescription(answerDescription));
                    } else {
                        console.error('Invalid signaling state for setting remote description:', peerConnection.signalingState);
                    }
                }
                catch (e) {
                    console.error('Error setting remote description', e);
                }
            }
        } else if (data.type === 'ice-candidate') {
            if (data.candidate && peerConnection) {
                try {
                    console.log('Adding ICE candidate:', data.candidate);
                    await peerConnection.addIceCandidate(data.candidate);
                } catch (e) {
                    console.error('Error adding received ICE candidate', e);
                }
            }
        } else if (data.type === 'mouse-move') {
            // Forward remote control commands to main process
            window.electronAPI.sendMouseMove(data.x, data.y);
        } else if (data.type === 'mouse-click') {
            window.electronAPI.sendMouseClick(data.button);
        } else if (data.type === 'key-press') {
            window.electronAPI.sendKeyPress(data.key);
        }
    }

    // Listen for signaling messages from the main process
    window.electronAPI.onSignalingMessage(handleSignalingMessage);
})();
