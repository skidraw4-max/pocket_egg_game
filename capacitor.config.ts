import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pocketegg.game',
  appName: '포켓에그',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    AdMob: {
      appId: {
        android: 'ca-app-pub-2237287742271246~1509205555',
      },
      initializeForTesting: false,
    },
    SplashScreen: {
      launchShowDuration: 2500,
      launchAutoHide: true,
      backgroundColor: '#7c3aed',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#7c3aed',
    },
  },
  android: {
    minSdkVersion: 24,
    targetSdkVersion: 34,
    buildOptions: {
      keystorePath: undefined,
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
      releaseType: 'APK',
    },
  },
};

export default config;
