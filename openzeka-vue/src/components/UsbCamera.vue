<template>
  <v-container>
    <v-card class="pa-5">
      <v-card-title>
        <h1 class="text-h4">Usb Camera Application</h1>
      </v-card-title>

      <v-card-text>
        <v-btn @click="requestGetCameras" color="primary" class="mb-4">Get Camera List</v-btn>

        <div v-if="cameras.length">
          <h2 class="text-h6">Select Camera</h2>
          <v-radio-group v-model="selectedCamera" class="mb-4">
            <v-radio
                v-for="camera in cameras"
                :key="camera.deviceId"
                :label="camera.label"
                :value="camera.deviceId"
            ></v-radio>
          </v-radio-group>

          <v-btn @click="requestStartCamera" color="success" class="mr-2">Start Camera</v-btn>
          <v-btn @click="requestStopCamera" color="error">Stop Camera</v-btn>
        </div>
      </v-card-text>

      <v-card-actions>
        <v-responsive aspect-ratio="16/9">
          <video ref="video" autoplay playsinline style="width: 100%; border: 1px solid #ccc;"></video>
        </v-responsive>
      </v-card-actions>
    </v-card>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      cameras: [],
      selectedCamera: null,
      signalingServer: null,
      peerConnection: null,
      remoteStream: null,
    };
  },
  methods: {
    async requestGetCameras() {
      this.signalingServer.send(JSON.stringify({ type: 'get-cameras' }));
    },
    async requestStartCamera() {
      if (!this.selectedCamera) {
        alert('Please select a camera first.');
        return;
      }
      this.signalingServer.send(
          JSON.stringify({ type: 'start-camera', deviceId: this.selectedCamera })
      );
    },
    requestStopCamera() {
      this.signalingServer.send(JSON.stringify({ type: 'stop-camera' }));
    },
    startSignaling() {
      this.signalingServer = new WebSocket('ws://localhost:8080');
      this.signalingServer.onmessage = async (message) => {
        const data = JSON.parse(message.data);

        if (data.type === 'camera-list') {
          this.cameras = data.cameras;
        } else if (data.type === 'offer') {
          await this.handleOffer(data.offer);
        } else if (data.type === 'answer') {
          await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription(data.answer)
          );
        } else if (data.type === 'ice-candidate') {
          if (data.candidate && this.peerConnection) {
            await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(data.candidate)
            );
          }
        }
      };

      this.signalingServer.onopen = () => console.log('Signaling server connected');
    },
    async handleOffer(offer) {
      this.createPeerConnection();
      await this.peerConnection.setRemoteDescription(
          new RTCSessionDescription(offer)
      );

      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      this.signalingServer.send(
          JSON.stringify({type: 'answer', answer: this.peerConnection.localDescription})
      );
    },
    createPeerConnection() {
      const configuration = {
        iceServers: [{urls: 'stun:stun.l.google.com:19302'}],
      };
      this.peerConnection = new RTCPeerConnection(configuration);

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.signalingServer.send(
              JSON.stringify({type: 'ice-candidate', candidate: event.candidate})
          );
        }
      };

      this.peerConnection.ontrack = (event) => {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
          this.$refs.video.srcObject = this.remoteStream;
        }
        this.remoteStream.addTrack(event.track);
      };
    },
  },
  mounted() {
    this.startSignaling();
  },
};
</script>

<style>
video {
  width: 100%;
  max-width: 600px;
  border: 1px solid #ccc;
  margin-top: 20px;
}
</style>
