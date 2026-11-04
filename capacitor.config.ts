import type { CapacitorConfig } from '@capacitor/cli';
import '@capacitor-firebase/authentication';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

/** cap sync 시 .env (+ production 모드면 .env.production) 반영 */
function loadEnvFiles() {
  const projectRoot = process.cwd();
  const loadEnvFile = (filename: string) => {
    const filePath = join(projectRoot, filename);
    if (!existsSync(filePath)) return;
    for (const line of readFileSync(filePath, 'utf-8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      process.env[key] = val;
    }
  };

  loadEnvFile('.env');
  if (process.env.NODE_ENV === 'production') {
    loadEnvFile('.env.production');
  }
}

loadEnvFiles();

const config: CapacitorConfig = {
  appId: 'com.pocketegg.game',
  appName: '포켓에그',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
  plugins: {
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
      overlaysWebView: true,
    },
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
    SystemBars: {
      insetsHandling: 'css',
      style: 'DARK',
      hidden: false,
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
