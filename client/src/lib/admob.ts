/**
 * admob.ts — AdMob 보상형 광고 연동 유틸리티
 *
 * 환경별 동작:
 *  - Android 네이티브 앱(Capacitor): @capacitor-community/admob 플러그인 사용
 *  - 웹/PWA: 광고 미지원 → 사용자에게 안내 메시지 표시
 *
 * BGM 연동:
 *  - 광고 표시 직전 AudioContext suspend (BGM 정지)
 *  - 광고 종료(Dismissed) 후 AudioContext resume (BGM 재개)
 *
 * 광고 단위 ID:
 *   VITE_ADMOB_REWARDED_AD_UNIT_ID 환경변수 또는 하드코딩 값 사용
 */

export interface AdResult {
  success: boolean;
  /** 광고 시청 완료 여부 (보상 지급 기준) */
  rewarded: boolean;
  /** 실패 사유 */
  reason?: 'not_available' | 'user_closed' | 'error' | 'not_loaded' | 'web_unsupported';
}

/** 보상형 광고 단위 ID */
const REWARDED_AD_UNIT_ID: string =
  (import.meta.env.VITE_ADMOB_REWARDED_AD_UNIT_ID as string) ||
  'ca-app-pub-2237287742271246/3695963735';

/** Capacitor 환경 여부 */
function isCapacitorEnv(): boolean {
  return typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.() === true;
}

// ─── BGM 일시정지 / 재개 헬퍼 ───────────────────────────────────────────────
// useSound 모듈의 전역 AudioContext를 직접 참조하는 대신,
// window.__audioCtxForAd__ 에 AudioContext를 노출하는 방식으로 연결합니다.
// useSound.ts 에서 getAudioCtx() 호출 시 window.__audioCtxForAd__ 에 등록합니다.

function suspendBGM() {
  try {
    const ctx: AudioContext | undefined = (window as any).__audioCtxForAd__;
    if (ctx && ctx.state === 'running') {
      ctx.suspend();
    }
  } catch {}
}

function resumeBGM() {
  try {
    const ctx: AudioContext | undefined = (window as any).__audioCtxForAd__;
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch {}
}
// ────────────────────────────────────────────────────────────────────────────

/** AdMob 초기화 상태 */
let _initialized = false;
let _initPromise: Promise<void> | null = null;

/** AdMob SDK 초기화 (앱 시작 시 1회 호출) */
export async function initAdMob(): Promise<void> {
  if (!isCapacitorEnv()) return;
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      const { AdMob } = await import('@capacitor-community/admob');
      await AdMob.initialize({
        requestTrackingAuthorization: false,
        testingDevices: [],
        initializeForTesting: false,
      });
      _initialized = true;
      console.log('[AdMob] 초기화 완료');
    } catch (e) {
      console.warn('[AdMob] 초기화 실패:', e);
    }
  })();

  return _initPromise;
}

/**
 * 보상형 광고 표시
 * - Android 네이티브: AdMob Rewarded Ad (광고 중 BGM 자동 정지/재개)
 * - 웹/PWA: 미지원 안내 반환
 */
export async function showRewardedAd(): Promise<AdResult> {
  // 웹/PWA 환경 — 광고 미지원
  if (!isCapacitorEnv()) {
    return { success: false, rewarded: false, reason: 'web_unsupported' };
  }

  // 초기화 보장
  if (!_initialized) {
    await initAdMob();
  }

  return showCapacitorRewardedAd();
}

/** Capacitor AdMob 보상형 광고 표시 */
async function showCapacitorRewardedAd(): Promise<AdResult> {
  try {
    const { AdMob, RewardAdPluginEvents } = await import('@capacitor-community/admob');

    // 광고 로드
    await AdMob.prepareRewardVideoAd({
      adId: REWARDED_AD_UNIT_ID,
      isTesting: false,
    });

    return new Promise<AdResult>((resolve) => {
      let rewarded = false;
      let settled = false;

      const settle = (result: AdResult) => {
        if (settled) return;
        settled = true;
        // 광고 종료 → BGM 재개
        resumeBGM();
        // 리스너 제거
        AdMob.removeAllListeners().catch(() => {});
        resolve(result);
      };

      // 보상 지급 이벤트 (광고 끝까지 시청)
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        rewarded = true;
      });

      // 광고 닫힘 이벤트
      AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        settle({ success: true, rewarded });
      });

      // 광고 로드 실패
      AdMob.addListener(RewardAdPluginEvents.FailedToLoad, () => {
        settle({ success: false, rewarded: false, reason: 'not_loaded' });
      });

      // 광고 표시 실패
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, () => {
        settle({ success: false, rewarded: false, reason: 'error' });
      });

      // 광고 표시 직전 BGM 정지 → 광고 시작
      suspendBGM();
      AdMob.showRewardVideoAd().catch(() => {
        settle({ success: false, rewarded: false, reason: 'error' });
      });

      // 타임아웃: 30초 내 응답 없으면 실패 처리
      setTimeout(() => {
        settle({ success: false, rewarded: false, reason: 'not_loaded' });
      }, 30_000);
    });
  } catch (e) {
    console.error('[AdMob] 광고 오류:', e);
    // 오류 시에도 BGM 재개 보장
    resumeBGM();
    return { success: false, rewarded: false, reason: 'error' };
  }
}
