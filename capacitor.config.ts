import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.webtoapp.wrapper',
  appName: 'WebToApp',
  webDir: 'www',
  server: {
    url: 'https://example.com',
    cleartext: false,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
