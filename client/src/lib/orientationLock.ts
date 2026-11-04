import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

async function applyPortraitLock(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      await ScreenOrientation.lock({ orientation: 'portrait' });
    } catch {
      // 일부 기기/OS 조합에서 lock이 거부될 수 있음
    }
    return;
  }

  const orientation = screen.orientation;
  if (!orientation?.lock) return;

  orientation.lock('portrait').catch(() => {
    // PWA/브라우저는 fullscreen 없이 lock이 거부될 수 있음
  });
}

/** 모바일/Android에서 세로 모드 고정 */
export function lockPortraitOrientation(): void {
  void applyPortraitLock();

  if (!Capacitor.isNativePlatform()) return;

  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {
      void applyPortraitLock();
    }
  });

  void App.addListener('resume', () => {
    void applyPortraitLock();
  });
}
