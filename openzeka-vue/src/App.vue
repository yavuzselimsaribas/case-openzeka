<template>
  <v-app>
    <!-- Toolbar -->
    <v-app-bar app color="primary" dark>
      <v-toolbar-title>Remote Access Application</v-toolbar-title>
    </v-app-bar>

    <v-main>
      <v-container>
        <v-row>
          <v-col cols="12" md="6">
            <!-- USB Camera Component -->
            <CameraComponent />
          </v-col>
          <v-col cols="12" md="6">
            <!-- Remote Desktop Component -->
            <RemoteDesktopComponent />
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script>
import CameraComponent from './components/CameraComponent.vue';
import RemoteDesktopComponent from './components/RemoteDesktopComponent.vue';

export default {
  name: 'App',
  components: {
    CameraComponent,
    RemoteDesktopComponent,
  },
};
</script>

<style>
/* Optional global styles for App */
</style>
