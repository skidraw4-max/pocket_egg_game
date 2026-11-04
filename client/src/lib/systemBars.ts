/**
 * systemBars.ts — Android/iOS 하단 내비게이션 바(휴대폰 버튼) 숨김
 */
import { App } from '@capacitor/app';
import { Capacitor, SystemBarType, SystemBars } from '@capacitor/core';

let rewardedAdShowing = false;

export function setRewardedAdShowing(showing: boolean): void {
  rewardedAdShowing = showing;
  if (showing) {
    void showSystemBarsForRewardedAd();
  } else {
    void hideNavigationBar();
  }
}

/** @deprecated TNK 호환 */
export const setTnkAdShowing = setRewardedAdShowing;

async function showSystemBarsForRewardedAd(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await SystemBars.show({ bar: SystemBarType.NavigationBar });
    await SystemBars.show({ bar: SystemBarType.StatusBar });
  } catch (err) {
    console.warn('[SystemBars] show for rewarded ad failed', err);
  }
}

export async function hideNavigationBar(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  if (rewardedAdShowing) return;
  try {
    await SystemBars.hide({ bar: SystemBarType.NavigationBar });
  } catch (err) {
    console.warn('[SystemBars] hide NavigationBar failed', err);
  }
}

export function initGameSystemBars(): void {
  if (!Capacitor.isNativePlatform()) return;

  void hideNavigationBar();

  void App.addListener('appStateChange', ({ isActive }) => {
    if (isActive && !rewardedAdShowing) void hideNavigationBar();
  });

  void App.addListener('resume', () => {
    if (!rewardedAdShowing) void hideNavigationBar();
  });
}
