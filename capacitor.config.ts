import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.webtoapp.zifer',
  appName: 'WebToApp',
  webDir: 'www',
  server: {
    url: 'https://example.com', // Ini bakal otomatis diganti sama script inject-config.js pas build
    cleartext: false,
    androidScheme: 'https',
    errorPath: 'offline.html' // <--- TAMBAHKAN BARIS INI
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
