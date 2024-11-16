<template>
  <v-card class="pa-4">
    <v-card-title>Remote Desktop Control</v-card-title>
    <v-card-text>
      <v-btn @click="getScreenList" color="primary" class="mb-4">
        Get Screen List
      </v-btn>
      <v-divider></v-divider>
      <v-container v-if="screens.length">
        <v-select
            v-model="selectedScreen"
            :items="screens"
            item-title="name"
            item-value="id"
            label="Select a Screen"
        ></v-select>
        <v-btn @click="startScreenShare" color="success" class="mr-2 mt-2">
          Start Screen Share
        </v-btn>
        <v-btn @click="stopScreenShare" color="error" class="mr-2 mt-2">
          Stop Screen Share
        </v-btn>
        <v-btn @click="toggleFullscreen" color="primary" class="mt-2">
          Toggle Fullscreen
        </v-btn>

      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-responsive>
        <video
            id="remote-desktop-video"
            autoplay
            playsinline
            tabindex="0"
            style="width: 100%; border: 1px solid #ccc; cursor: crosshair;"
            @mousemove="handleMouseMove"
            @click="handleMouseClick"
            @dblclick="toggleFullscreen"
        ></video>
      </v-responsive>
    </v-card-actions>

  </v-card>
</template>

<script lang="ts">
import { defineComponent, nextTick, onMounted, ref } from "vue";
import {WebRTCClient} from "@/service/signaling";

export default defineComponent({
  name: "RemoteDesktopComponent",
  setup() {
    const webrtcClient = ref<WebRTCClient | null>(null);
    const screens = ref<Array<{ id: string; name: string }>>([]);
    const selectedScreen = ref<string>("");
    const videoElement = ref<HTMLVideoElement | null>(null);
    const isScreenSharing = ref(false); // Track screen share status

    const getScreenList = () => {
      webrtcClient.value?.requestScreenList();
    };

    const startScreenShare = () => {
      if (selectedScreen.value) {
        webrtcClient.value?.startScreenShare(selectedScreen.value);
        isScreenSharing.value = true; // Mark screen share as active
      } else {
        alert("Please select a screen");
      }
    };

    const stopScreenShare = () => {
      webrtcClient.value?.stopScreenShare();
      isScreenSharing.value = false; // Mark screen share as inactive
      if (videoElement.value && videoElement.value.srcObject) {
        (videoElement.value.srcObject as MediaStream).getTracks().forEach((track) =>
            track.stop()
        );
        videoElement.value.srcObject = null;
      }
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isScreenSharing.value) return; // Skip if screen sharing is not active

      const rect = (event.target as HTMLVideoElement).getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 1920; // Adjust for resolution
      const y = ((event.clientY - rect.top) / rect.height) * 1080;
      webrtcClient.value?.sendMouseMove(x, y);
    };

    const handleMouseClick = () => {
      if (!isScreenSharing.value) return; // Skip if screen sharing is not active

      webrtcClient.value?.sendMouseClick("left");
      if (videoElement.value) {
        videoElement.value.focus(); // Ensure the video element is focused
      }
    };

    const handleKeypress = (event: KeyboardEvent) => {
      if (!isScreenSharing.value) return; // Skip if screen sharing is not active

      event.preventDefault(); // Prevent default actions like backspace navigation
      console.log("Key pressed:", event.key);
      webrtcClient.value?.sendKeyPress(event.key);
    };

    const toggleFullscreen = () => {
      if (videoElement.value) {
        if (!document.fullscreenElement) {
          videoElement.value.requestFullscreen().catch((err) => {
            console.error("Error attempting to enable fullscreen mode:", err);
          });
        } else {
          document.exitFullscreen().catch((err) => {
            console.error("Error attempting to exit fullscreen mode:", err);
          });
        }
      }
    };

    onMounted(() => {
      videoElement.value = document.getElementById("remote-desktop-video") as HTMLVideoElement;

      if (!videoElement.value) {
        console.error("Video element for screen share not found");
      }

      videoElement.value?.addEventListener("keydown", handleKeypress);

      webrtcClient.value = new WebRTCClient("ws://localhost:8080", "screen");

      // Set the callback for screen share stream
      webrtcClient.value.onRemoteStream = (stream: MediaStream) => {
        console.log("Remote stream received for screen share:", stream);
        nextTick(() => {
          if (videoElement.value) {
            videoElement.value.srcObject = stream;
            videoElement.value.play().catch((err) =>
                console.error("Error playing screen share video:", err)
            );
          }
        });
      };

      // Set the callback for receiving the screen list
      webrtcClient.value.onScreenList = (screenList) => {
        screens.value = screenList.map((screen) => ({
          name: screen.name || `Screen ${screen.id}`,
          id: screen.id,
        }));
      };
    });

    return {
      getScreenList,
      startScreenShare,
      stopScreenShare,
      screens,
      selectedScreen,
      videoElement,
      isScreenSharing,
      handleMouseMove,
      handleMouseClick,
      toggleFullscreen,
    };
  },
});
</script>

<style>
video {
  width: 100%;
  border: 1px solid #ccc;
}
</style>
