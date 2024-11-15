<template>
  <v-container>
    <v-card class="pa-5">
      <v-card-title>
        <h1 class="text-h4">Remote Desktop</h1>
      </v-card-title>

      <v-card-text>
        <v-btn @click="requestGetSources" color="primary" class="mb-4">Get Sources</v-btn>
        <v-btn @click="requestStartScreenShare" color="primary" class="mr-2">Start Screen Share</v-btn>
        <v-btn @click="stopScreenShare" color="error">Stop Screen Share</v-btn>

        <div v-if="sources.length">
          <h2 class="text-h6">Select Source</h2>
          <v-radio-group v-model="selectedSource" class="mb-4">
            <v-radio
                v-for="source in sources"
                :key="source.id"
                :label="source.name"
                :value="source.id"
            ></v-radio>
          </v-radio-group>
        </div>

      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      peerConnection: null,
      signalingServer: null,
      sources: [],
      selectedSource: null,
    };
  },
  methods: {
    async requestGetSources() {
      this.signalingServer.send(JSON.stringify({ type: 'get-sources' }));
    },
    async requestStartScreenShare() {
      this.signalingServer.send(JSON.stringify({ type: 'start-screen-share', sourceId: this.selectedSource }));
    },
    stopScreenShare() {
      if (this.peerConnection) {
        this.peerConnection.getSenders().forEach(sender => sender.track.stop());
        this.closePeerConnection();
      }
    },
    createPeerConnection() {
      this.peerConnection = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });

      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
          this.signalingServer.send(JSON.stringify({ type: 'ice-candidate', candidate: event.candidate }));
        }
      };

      this.peerConnection.ontrack = () => {
        console.log('Received remote stream');
      };
    },
    closePeerConnection() {
      if (this.peerConnection) {
        this.peerConnection.close();
        this.peerConnection = null;
      }
    },
  },
  mounted() {
    this.signalingServer = new WebSocket('ws://localhost:8080');
    this.signalingServer.onmessage = async (message) => {
      const data = JSON.parse(message.data);
      if (data.type === 'offer') {
        this.createPeerConnection();
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        this.signalingServer.send(JSON.stringify({ type: 'answer', answer }));
      }
      else if (data.type === 'sources') {
        this.sources = data.sources;
      }
    };
  },
};
</script>
