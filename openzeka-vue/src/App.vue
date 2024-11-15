<template>
  <v-app>
    <v-main>
      <v-container>
        <!-- USB Camera Component -->
        <UsbCamera />

        <!-- Remote Desktop Component -->
        <RemoteDesktop />
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import UsbCamera from './components/UsbCamera.vue';
import RemoteDesktop from './components/RemoteDesktop.vue';

export default {
  name: 'App',
  components: {
    UsbCamera,
    RemoteDesktop,
  },
};
</script>

<style>
/* Global styles can be added here if needed */
</style>
