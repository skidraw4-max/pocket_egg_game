/**
 * TNK Factory Publisher SDK — 보상형(리워드) 동영상
 * Android Capacitor 네이티브 플러그인 TnkAds
 */

import { registerPlugin } from '@capacitor/core';
import { TNK_PUBLISHER_ID, TNK_PLACEMENT_MISSION, type TnkRewardedPlacement } from './tnkConfig';

export interface AdResult {
  success: boolean;
  rewarded: boolean;
  reason?: 'not_available' | 'user_closed' | 'error' | 'not_loaded' | 'web_unsupported';
}

interface TnkAdsPlugin {
  initialize(): Promise<void>;
  configure(options: { publisherId: string }): Promise<{ message: string }>;
  showRewarded(options: { placementId: string }): Promise<{
    success: boolean;
    rewarded: boolean;
    reason?: string;
  }>;
}

const TnkAds = registerPlugin<TnkAdsPlugin>('TnkAds');

function isCapacitorEnv(): boolean {
  return (
    typeof (window as any).Capacitor !== 'undefined' &&
    (window as any).Capacitor?.isNativePlatform?.() === true
  );
}

function suspendBGM() {
  try {
    const ctx: AudioContext | undefined = (window as any).__audioCtxForAd__;
    if (ctx && ctx.state === 'running') ctx.suspend();
  } catch {
    /* ignore */
  }
}

function resumeBGM() {
  try {
    const ctx: AudioContext | undefined = (window as any).__audioCtxForAd__;
    if (ctx && ctx.state === 'suspended') ctx.resume();
  } catch {
    /* ignore */
  }
}

let _initialized = false;
let _initPromise: Promise<void> | null = null;
let _adQueue: Promise<void> = Promise.resolve();

function mapNativeResult(raw: {
  success: boolean;
  rewarded: boolean;
  reason?: string;
}): AdResult {
  if (raw.rewarded) return { success: true, rewarded: true };
  if (raw.success) return { success: true, rewarded: false, reason: 'user_closed' };
  const reason = raw.reason === 'error' ? 'error' : 'not_loaded';
  return { success: false, rewarded: false, reason };
}

async function configureTnk(): Promise<void> {
  await TnkAds.configure({ publisherId: TNK_PUBLISHER_ID });
}

export async function initRewardedAds(): Promise<void> {
  if (!isCapacitorEnv()) return;
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      await TnkAds.initialize();
      await configureTnk();
      _initialized = true;
      console.log('[TNK] Publisher SDK 준비 완료');
    } catch (e) {
      console.warn('[TNK] 초기화 실패:', e);
    }
  })();

  return _initPromise;
}

export async function showRewardedAd(
  placementId: TnkRewardedPlacement = TNK_PLACEMENT_MISSION,
): Promise<AdResult> {
  if (!isCapacitorEnv()) {
    return { success: false, rewarded: false, reason: 'web_unsupported' };
  }

  if (!_initialized) await initRewardedAds();
  if (!_initialized) {
    return { success: false, rewarded: false, reason: 'not_available' };
  }

  const run = async (): Promise<AdResult> => {
    suspendBGM();
    try {
      await configureTnk();
      console.log(`[TNK] rewarded request (${placementId})`);
      const raw = await TnkAds.showRewarded({ placementId });
      return mapNativeResult(raw);
    } catch (e) {
      console.warn('[TNK] showRewarded 실패:', e);
      return { success: false, rewarded: false, reason: 'error' };
    } finally {
      resumeBGM();
    }
  };

  const op = _adQueue.then(run);
  _adQueue = op.then(
    () => undefined,
    () => undefined,
  );
  return op;
}
