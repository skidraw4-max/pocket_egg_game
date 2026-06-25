/**
 * PWAPrompt
 * PWA 설치 프롬프트 및 알림 권한 요청 UI
 *
 * - beforeinstallprompt 이벤트 캡처 → "홈 화면에 추가" 버튼 표시
 * - Notification API 권한 요청 버튼 표시
 * - 각각 한 번 거절하면 7일간 다시 표시 안 함
 */
import { useState, useEffect, useCallback } from 'react';

const INSTALL_DISMISSED_KEY = 'pocket_egg_install_dismissed';
const NOTIF_DISMISSED_KEY = 'pocket_egg_notif_dismissed';
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7일

function isDismissed(key: string): boolean {
  const ts = localStorage.getItem(key);
  if (!ts) return false;
  return Date.now() - Number(ts) < DISMISS_DURATION_MS;
}

function dismiss(key: string) {
  localStorage.setItem(key, String(Date.now()));
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');

  // beforeinstallprompt 이벤트 캡처
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (!isDismissed(INSTALL_DISMISSED_KEY)) {
        // 앱 진입 3초 후 설치 프롬프트 표시
        setTimeout(() => setShowInstall(true), 3000);
      }
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // 알림 권한 상태 초기화
  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setNotifPermission(Notification.permission);
      // 권한이 default이고 dismiss 안 된 경우 → 설치 프롬프트 닫힌 후 표시
      if (Notification.permission === 'default' && !isDismissed(NOTIF_DISMISSED_KEY)) {
        // 설치 프롬프트가 없으면 바로 알림 프롬프트 표시 (5초 후)
        const timer = setTimeout(() => {
          if (!isDismissed(NOTIF_DISMISSED_KEY)) {
            setShowNotif(true);
          }
        }, 5000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  // PWA 설치 실행
  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowInstall(false);
      setInstallPrompt(null);
    } else {
      dismiss(INSTALL_DISMISSED_KEY);
      setShowInstall(false);
    }
  }, [installPrompt]);

  // 설치 프롬프트 닫기
  const handleDismissInstall = useCallback(() => {
    dismiss(INSTALL_DISMISSED_KEY);
    setShowInstall(false);
    // 설치 닫은 후 알림 프롬프트 표시
    if (
      typeof Notification !== 'undefined' &&
      Notification.permission === 'default' &&
      !isDismissed(NOTIF_DISMISSED_KEY)
    ) {
      setTimeout(() => setShowNotif(true), 500);
    }
  }, []);

  // 알림 권한 요청
  const handleRequestNotif = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    setShowNotif(false);
    if (result !== 'granted') {
      dismiss(NOTIF_DISMISSED_KEY);
    }
  }, []);

  // 알림 프롬프트 닫기
  const handleDismissNotif = useCallback(() => {
    dismiss(NOTIF_DISMISSED_KEY);
    setShowNotif(false);
  }, []);

  // 아무것도 표시할 게 없으면 렌더링 안 함
  if (!showInstall && !showNotif) return null;

  return (
    <>
      {/* PWA 설치 프롬프트 */}
      {showInstall && (
        <div className="fixed bottom-24 left-4 right-4 z-[200] animate-slide-up">
          <div className="bg-white rounded-3xl shadow-xl border border-border p-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl overflow-hidden flex-shrink-0 shadow">
              <img src="/icon-192.png" alt="포켓 에그" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-warm-brown leading-tight">홈 화면에 추가하기</p>
              <p className="text-xs text-sub-brown mt-0.5 leading-snug">
                포켓 에그를 앱처럼 설치하면 더 빠르게 접속할 수 있어요!
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={handleInstall}
                  className="flex-1 py-1.5 rounded-full bg-peach text-xs font-bold text-warm-brown shadow"
                >
                  설치하기
                </button>
                <button
                  onClick={handleDismissInstall}
                  className="px-3 py-1.5 rounded-full bg-white border border-border text-xs text-sub-brown"
                >
                  나중에
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 알림 권한 요청 프롬프트 */}
      {showNotif && !showInstall && notifPermission === 'default' && (
        <div className="fixed bottom-24 left-4 right-4 z-[200] animate-slide-up">
          <div className="bg-white rounded-3xl shadow-xl border border-border p-4 flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-peach/30 flex items-center justify-center flex-shrink-0 text-2xl">
              🔔
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-warm-brown leading-tight">반려몬 알림 받기</p>
              <p className="text-xs text-sub-brown mt-0.5 leading-snug">
                반려몬이 배고프거나 피곤할 때 알림을 보내드릴게요!
              </p>
              <div className="flex gap-2 mt-2.5">
                <button
                  onClick={handleRequestNotif}
                  className="flex-1 py-1.5 rounded-full bg-mint/80 text-xs font-bold text-warm-brown shadow"
                >
                  알림 허용
                </button>
                <button
                  onClick={handleDismissNotif}
                  className="px-3 py-1.5 rounded-full bg-white border border-border text-xs text-sub-brown"
                >
                  괜찮아요
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
