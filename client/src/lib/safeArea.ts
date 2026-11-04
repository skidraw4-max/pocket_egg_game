/**
 * safeArea.ts — 앱 Safe Area inset (--safe-top / --safe-bottom) 초기화
 * StatusBar overlay 모드에서 Android WebView env()가 0일 때 네이티브·fallback 보정
 */
import { Capacitor } from '@capacitor/core';

function probeEnvInset(side: 'top' | 'bottom'): number {
  const el = document.createElement('div');
  el.style.position = 'fixed';
  el.style.visibility = 'hidden';
  el.style.pointerEvents = 'none';
  el.style.top = '0';
  el.style.left = '0';
  if (side === 'top') {
    el.style.paddingTop = 'env(safe-area-inset-top, 0px)';
  } else {
    el.style.paddingBottom = 'env(safe-area-inset-bottom, 0px)';
  }
  document.documentElement.appendChild(el);
  const style = getComputedStyle(el);
  const raw = side === 'top' ? style.paddingTop : style.paddingBottom;
  document.documentElement.removeChild(el);
  return parseFloat(raw) || 0;
}

/** Android overlay WebView에서 env()가 0일 때 대략적인 status bar 높이 (CSS px) */
function androidStatusBarFallback(): number {
  const w = window.innerWidth || 360;
  // 360dp 기준 24dp status bar → 화면 너비에 비례 (대략 24~32px)
  return Math.round(Math.max(24, Math.min(36, 24 * (w / 360))));
}

function readCssVar(name: string): number {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return parseFloat(raw) || 0;
}

function applySafeAreaVars() {
  const root = document.documentElement;
  let top = Math.max(probeEnvInset('top'), readCssVar('--safe-top'));
  let bottom = Math.max(probeEnvInset('bottom'), readCssVar('--safe-bottom'));

  if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android') {
    if (top < 1) top = androidStatusBarFallback();
  }

  root.style.setProperty('--safe-top', `${top}px`);
  root.style.setProperty('--safe-bottom', `${bottom}px`);
}

/** 앱 시작 시 1회 호출 — resize / visualViewport 변경 시 재계산 */
export function initAppSafeArea(): void {
  applySafeAreaVars();

  const onChange = () => applySafeAreaVars();
  window.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('resize', onChange);
  window.visualViewport?.addEventListener('scroll', onChange);

  // Capacitor WebView 준비 직후 한 번 더 (네이티브 inject 대기)
  if (Capacitor.isNativePlatform()) {
    window.setTimeout(onChange, 100);
    window.setTimeout(onChange, 500);
  }
}
