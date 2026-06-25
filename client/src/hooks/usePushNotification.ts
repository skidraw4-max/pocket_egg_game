/**
 * usePushNotification
 * Web Notification API를 이용한 반려몬 상태 알림 훅
 *
 * - 알림 권한 요청
 * - 반려몬 배고픔/피로/청결 임계치 도달 시 알림 발송
 * - 마지막 알림 시간 기록으로 중복 방지 (최소 30분 간격)
 */
import { useCallback, useEffect, useRef } from 'react';
import { GameState } from '@/lib/gameState';

const NOTIF_COOLDOWN_MS = 30 * 60 * 1000; // 30분
const STORAGE_KEY = 'pocket_egg_last_notif';

interface LastNotif {
  hunger?: number;
  fatigue?: number;
  clean?: number;
}

function getLastNotif(): LastNotif {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function setLastNotif(data: LastNotif) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function canNotify(key: keyof LastNotif): boolean {
  const last = getLastNotif();
  const ts = last[key];
  if (!ts) return true;
  return Date.now() - ts > NOTIF_COOLDOWN_MS;
}

function markNotified(key: keyof LastNotif) {
  const last = getLastNotif();
  setLastNotif({ ...last, [key]: Date.now() });
}

function sendNotification(title: string, body: string, icon = '/icon-192.png') {
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon,
      badge: '/icon-192.png',
      tag: 'pocket-egg-status',
      renotify: true,
      silent: false,
    });
  } catch (e) {
    // Safari 등 일부 브라우저에서 옵션 미지원 시 폴백
    try {
      new Notification(title, { body, icon });
    } catch {
      // 알림 미지원 환경 무시
    }
  }
}

export function usePushNotification() {
  const permissionRef = useRef<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  );

  /** 알림 권한 요청 */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof Notification === 'undefined') return 'denied';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied') return 'denied';
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result;
  }, []);

  /** 현재 권한 상태 */
  const getPermission = useCallback((): NotificationPermission => {
    if (typeof Notification === 'undefined') return 'denied';
    return Notification.permission;
  }, []);

  /**
   * 반려몬 상태를 확인하고 필요한 알림을 발송
   * GameContext에서 gameState 변경 시마다 호출
   */
  const checkAndNotify = useCallback((state: GameState) => {
    if (typeof Notification === 'undefined') return;
    if (Notification.permission !== 'granted') return;
    // 알 단계는 알림 없음
    if (state.pet.stage === 'egg') return;

    const name = state.pet.name || '반려몬';

    // 배고픔 (hunger ≤ 20)
    if (state.status.hunger <= 20 && canNotify('hunger')) {
      sendNotification(
        `🍖 ${name}이(가) 배고파요!`,
        `${name}의 배고픔이 위험 수준이에요. 지금 바로 먹이를 주세요!`
      );
      markNotified('hunger');
    }

    // 피로 (fatigue ≥ 80)
    if (state.status.fatigue >= 80 && canNotify('fatigue')) {
      sendNotification(
        `😴 ${name}이(가) 너무 피곤해요!`,
        `${name}이 지쳐 있어요. 재워주세요!`
      );
      markNotified('fatigue');
    }

    // 청결 (clean ≤ 20)
    if (state.status.clean <= 20 && canNotify('clean')) {
      sendNotification(
        `🛁 ${name}이(가) 더러워요!`,
        `${name}을 씨겨주세요. 청결이 많이 낙아졌어요!`
      );
      markNotified('clean');
    }
  }, []);

  /**
   * 앱이 백그라운드/비활성 상태일 때 주기적으로 상태 체크
   * visibilitychange 이벤트로 포그라운드 복귀 시에도 체크
   */
  const scheduleBackgroundCheck = useCallback((getState: () => GameState | null) => {
    const check = () => {
      const state = getState();
      if (state) checkAndNotify(state);
    };

    // 페이지 숨김 → 표시 전환 시 체크
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        check();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // 5분마다 주기적 체크 (탭이 열려 있는 경우)
    const intervalId = setInterval(check, 5 * 60 * 1000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(intervalId);
    };
  }, [checkAndNotify]);

  return {
    requestPermission,
    getPermission,
    checkAndNotify,
    scheduleBackgroundCheck,
  };
}
