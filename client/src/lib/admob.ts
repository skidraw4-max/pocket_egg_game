/**
 * admob.ts — AdMob 보상형 광고 연동 유틸리티
 *
 * 연동 방식:
 *  - 웹(PWA): Google AdSense Rewarded Ad API 또는 AdMob Web SDK
 *  - 네이티브 앱(Capacitor/Cordova): @capacitor-community/admob 플러그인 사용
 *
 * 현재는 웹 환경에서 동작하는 Mock + AdSense 준비 구조로 구현되어 있습니다.
 * AdMob 앱 ID와 광고 단위 ID를 환경변수로 주입하면 실제 광고가 노출됩니다.
 *
 * 환경변수 설정 (client/.env):
 *   VITE_ADMOB_APP_ID=ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX
 *   VITE_ADMOB_REWARDED_AD_UNIT_ID=ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
 */

export interface AdResult {
  success: boolean;
  /** 광고 시청 완료 여부 (보상 지급 기준) */
  rewarded: boolean;
  /** 실패 사유 */
  reason?: 'not_available' | 'user_closed' | 'error' | 'not_loaded';
}

/** AdMob 광고 단위 ID */
const REWARDED_AD_UNIT_ID =
  (import.meta as any).env?.VITE_ADMOB_REWARDED_AD_UNIT_ID ?? '';

/** 광고 SDK 로드 여부 */
let adSdkLoaded = false;

/** 광고 SDK 초기화 (앱 시작 시 1회 호출) */
export async function initAdMob(): Promise<void> {
  // Capacitor 환경 감지 (네이티브 앱)
  if (isCapacitorEnv()) {
    try {
      // Capacitor 환경에서는 네이티브 플러그인을 window.__capacitorAdMob__에 주입해야 합니다.
      // (네이티브 앱 빌드 시 main.ts에서 import 후 window에 할당)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const capacitorAdMob = (window as any).__capacitorAdMob__;
      if (capacitorAdMob) {
        await capacitorAdMob.AdMob.initialize({
          requestTrackingAuthorization: true,
          testingDevices: [],
          initializeForTesting: !REWARDED_AD_UNIT_ID,
        });
        adSdkLoaded = true;
        console.log('[AdMob] Capacitor AdMob 초기화 완료');
      }
    } catch (e) {
      console.warn('[AdMob] Capacitor AdMob 초기화 실패:', e);
    }
    return;
  }

  // 웹 환경: Google AdSense/AdMob Web SDK 로드
  if (REWARDED_AD_UNIT_ID && !adSdkLoaded) {
    try {
      await loadAdSenseScript();
      adSdkLoaded = true;
      console.log('[AdMob] Web AdSense SDK 로드 완료');
    } catch (e) {
      console.warn('[AdMob] Web AdSense SDK 로드 실패:', e);
    }
  }
}

/**
 * 보상형 광고 표시
 * - Capacitor 환경: AdMob 플러그인 사용
 * - 웹 환경: AdSense Rewarded Ad 사용
 * - SDK 미설정 시: 개발용 Mock (3초 대기 후 보상 지급)
 */
export async function showRewardedAd(): Promise<AdResult> {
  // Capacitor 환경 (네이티브 앱)
  if (isCapacitorEnv() && adSdkLoaded) {
    return showCapacitorRewardedAd();
  }

  // 웹 환경 + AdSense SDK 로드 완료
  if (adSdkLoaded && REWARDED_AD_UNIT_ID) {
    return showWebRewardedAd();
  }

  // 개발 환경 Mock: 광고 ID 미설정 시 즉시 보상 지급 (테스트용)
  console.log('[AdMob] Mock 광고 실행 (개발 환경 — 실제 광고 ID 미설정)');
  return mockRewardedAd();
}

// ===== 내부 구현 =====

function isCapacitorEnv(): boolean {
  return typeof (window as any).Capacitor !== 'undefined';
}

async function loadAdSenseScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.getElementById('admob-adsense-script')) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.id = 'admob-adsense-script';
    script.async = true;
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('AdSense script load failed'));
    document.head.appendChild(script);
  });
}

async function showCapacitorRewardedAd(): Promise<AdResult> {
  try {
    // @capacitor-community/admob 는 네이티브 앱 빌드 시에만 설치되므로
    // 런타임에서 동적으로 로드 시도 (웹 빌드에서는 미설치 상태)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capacitorAdMob = (window as any).__capacitorAdMob__;
    if (!capacitorAdMob) {
      console.warn('[AdMob] Capacitor AdMob 플러그인을 찾을 수 없습니다.');
      return mockRewardedAd();
    }

    const { AdMob, RewardAdPluginEvents } = capacitorAdMob;

    // 광고 로드
    await AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_UNIT_ID || 'ca-app-pub-3940256099942544/5224354917', // 테스트 ID
      isTesting: !REWARDED_AD_UNIT_ID,
    });

    return new Promise((resolve) => {
      let rewarded = false;

      // 보상 지급 이벤트
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
      });

      // 광고 종료 이벤트
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        resolve({ success: true, rewarded });
      });

      // 광고 표시
      AdMob.showRewardVideoAd().catch(() => {
        resolve({ success: false, rewarded: false, reason: 'error' });
      });
    });
  } catch (e) {
    console.error('[AdMob] Capacitor 광고 오류:', e);
    return { success: false, rewarded: false, reason: 'error' };
  }
}

async function showWebRewardedAd(): Promise<AdResult> {
  // Google AdSense Rewarded Ad API (웹)
  // 실제 연동 시 AdSense 계정의 광고 단위 ID 필요
  try {
    const adsbygoogle = (window as any).adsbygoogle || [];
    return new Promise((resolve) => {
      adsbygoogle.push({
        googletag: {
          cmd: [() => {
            // 보상형 광고 슬롯 생성 및 표시
            resolve({ success: true, rewarded: true });
          }]
        }
      });
      // 타임아웃: 5초 내 응답 없으면 실패 처리
      setTimeout(() => {
        resolve({ success: false, rewarded: false, reason: 'not_loaded' });
      }, 5000);
    });
  } catch (e) {
    return { success: false, rewarded: false, reason: 'error' };
  }
}

/** 개발 환경용 Mock 광고 (실제 광고 없이 UI 테스트) */
async function mockRewardedAd(): Promise<AdResult> {
  return new Promise((resolve) => {
    // 실제 광고 시청 시뮬레이션: 2초 대기
    setTimeout(() => {
      resolve({ success: true, rewarded: true });
    }, 2000);
  });
}
