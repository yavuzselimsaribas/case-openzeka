<template>
  <v-card class="pa-4">
    <v-card-title>Camera Control</v-card-title>
    <v-card-text>
      <v-btn @click="getCameraList" color="primary" class="mb-4">
        Get Camera List
      </v-btn>
      <v-divider></v-divider>
      <v-container v-if="cameras.length">
        <v-select
            v-model="selectedCamera"
            :items="cameras"
            item-title="label"
            item-value="deviceId"
            label="Select a Camera"
        ></v-select>
        <v-btn @click="startCamera" color="success" class="mr-2 mt-2">
          Start Camera
        </v-btn>
        <v-btn @click="stopCamera" color="error" class="mt-2">
          Stop Camera
        </v-btn>
      </v-container>
    </v-card-text>
    <v-card-actions>
      <v-responsive>
        <video id="camera-video" autoplay playsinline style="width: 100%; border: 1px solid #ccc;"></video>
      </v-responsive>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { defineComponent, onMounted, ref } from 'vue';
import { getWebRTCClient } from '@/service/signaling';
import { nextTick } from 'vue';

export default defineComponent({
  name: 'CameraComponent',
  setup() {
    const webrtcClient = ref<ReturnType<typeof getWebRTCClient> | null>(null);
    const cameras = ref<Array<{ deviceId: string; label: string }>>([]);
    const selectedCamera = ref<string>('');
    const videoElement = ref<HTMLVideoElement | null>(null);

    const getCameraList = () => {
      webrtcClient.value?.requestCameraList();
    };

    const startCamera = () => {
      if (selectedCamera.value) {
        webrtcClient.value?.startCamera(selectedCamera.value);
      } else {
        alert('Please select a camera');
      }
    };

    const stopCamera = () => {
      webrtcClient.value?.stopCamera();
      if (videoElement.value && videoElement.value.srcObject) {
        (videoElement.value.srcObject as MediaStream).getTracks().forEach((track) => track.stop());
        videoElement.value.srcObject = null;
      }
    };

    onMounted(() => {
      videoElement.value = document.getElementById('camera-video') as HTMLVideoElement;

      if (!videoElement.value) {
        console.error('Video element for camera not found');
      }

      webrtcClient.value = getWebRTCClient();

      // Set the callback for camera stream
      webrtcClient.value.onRemoteStream = ((stream: MediaStream) => {
        console.log('Remote stream received for camera:', stream);
        nextTick(() => {
          if (videoElement.value) {
            videoElement.value.srcObject = stream;
            videoElement.value.play().catch((err) =>
                console.error('Error playing camera video:', err)
            );
          }
        });
      });

      // Set the callback for receiving the camera list
      webrtcClient.value.onCameraList = (cameraList) => {
        cameras.value = cameraList.map((camera) => ({
          label: camera.label || `Camera ${camera.deviceId}`,
          deviceId: camera.deviceId,
        }));
      };
    });


    return {
      getCameraList,
      startCamera,
      stopCamera,
      cameras,
      selectedCamera,
      videoElement,
    };
  },
});
</script>

<style>
video {
  width: 100%;
  border: 1px solid #ccc;
  margin-top: 20px;
}
</style>
