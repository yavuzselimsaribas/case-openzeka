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
        <v-btn @click="startScreenShare" color="success" class="mr-2 mt-2"
               :disabled = "isScreenSharing && sharedScreen === selectedScreen">
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
            @dblclick="handleMouseDoubleClick"
            @contextmenu.prevent="handleMouseClick"
            @wheel="handleMouseWheel"
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
    const sharedScreen = ref<string>("");

    const getScreenList = () => {
      webrtcClient.value?.requestScreenList();
    };

    const startScreenShare = () => {
      //if there is a screen started already, first stop it if it is not the same care as the selected one
      if (isScreenSharing.value && sharedScreen.value !== selectedScreen.value) {
        stopScreenShare();
      } else if (isScreenSharing.value && sharedScreen.value === selectedScreen.value) {
        return;
      }
      if (selectedScreen.value) {
        webrtcClient.value?.startScreenShare(selectedScreen.value);
        isScreenSharing.value = true; // Mark screen share as active
        sharedScreen.value = selectedScreen.value;
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

    const handleMouseClick = (event: MouseEvent) => {
      if (!isScreenSharing.value) return;

      const button = event.button === 2 ? 'right' : 'left'; // 0: left, 2: right
      webrtcClient.value?.sendMouseClick(button);
    };

    const handleMouseDoubleClick = (event: MouseEvent) => {
      if (!isScreenSharing.value) return;

      const button = event.button === 2 ? 'right' : 'left';
      webrtcClient.value?.sendMouseClick(button, true);
    };

    const handleKeypress = (event: KeyboardEvent) => {
      if (!isScreenSharing.value) return;

      event.preventDefault();

      const key = event.key;

      // For special characters or text input
      if (key.length === 1 || key === 'Enter' || key === 'Backspace') {
        webrtcClient.value?.sendKeyType(key);
      } else {
        const modifiers = [];
        if (event.ctrlKey) modifiers.push('control');
        if (event.shiftKey) modifiers.push('shift');
        if (event.altKey) modifiers.push('alt');
        if (event.metaKey) modifiers.push('command'); // For Mac OS

        webrtcClient.value?.sendKeyPress(key, modifiers);
      }
    };

    const handleMouseWheel = (event: WheelEvent) => {
      if (!isScreenSharing.value) return;

      // Prevent the default scrolling behavior
      event.preventDefault();

      const deltaX = event.deltaX;
      const deltaY = event.deltaY;

      webrtcClient.value?.sendMouseScroll(deltaX, deltaY);
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
      handleMouseWheel,
      toggleFullscreen,
      sharedScreen,
      handleMouseDoubleClick
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
