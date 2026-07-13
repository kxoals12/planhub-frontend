

// src/main.js
const { createApp } = Vue;

axios.defaults.baseURL = 'https://planhub-lulh.onrender.com'

const App = {
  name: 'App',
  components: { AppHeader },
  inject: ['modeState'],
  template: `
    <app-header v-if="modeState.current" />
    <router-view />
  `,
};

const app = createApp(App);

// 전역 모드 상태 provide — 모든 컴포넌트에서 inject('modeState')로 접근 가능
app.provide('modeState', modeState);

app.use(router);
app.mount('#app');

