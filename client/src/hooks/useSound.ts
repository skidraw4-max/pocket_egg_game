/**
 * useSound - 「포켓 에그: 나만의 반려몬」 사운드 매니저
 *
 * ★ 전역 싱글턴 구조 ★
 * - AudioContext, BGM GainNode, 볼륨/음소거 상태를 모듈 레벨에서 공유
 * - 어느 컴포넌트에서 setVolume/toggleMute를 호출해도 즉시 BGM에 반영됨
 *
 * ★ 백그라운드/화면잠금 대응 ★
 * - Page Visibility API (visibilitychange): 웹/PWA 환경
 * - Capacitor App 이벤트 (appStateChange): Android 네이티브 앱 환경
 * - 백그라운드 진입 시 AudioContext suspend → 포그라운드 복귀 시 resume
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export type SoundKey =
  | 'eating'
  | 'playing'
  | 'cleaning'
  | 'sleeping'
  | 'happy'
  | 'hungry'
  | 'dirty'
  | 'tired'
  | 'love'
  | 'touch';

export type BGMKey = 'main-room';

/** 효과음 파일 경로 */
const SOUND_URLS: Record<SoundKey, string> = {
  eating:   '/sounds/sfx-eating.wav',
  playing:  '/sounds/sfx-playing.wav',
  cleaning: '/sounds/sfx-cleaning.wav',
  sleeping: '/sounds/sfx-sleeping.wav',
  happy:    '/sounds/sfx-happy.wav',
  hungry:   '/sounds/sfx-hungry.wav',
  dirty:    '/sounds/sfx-dirty.wav',
  tired:    '/sounds/sfx-tired.wav',
  love:     '/sounds/sfx-love.wav',
  touch:    '/sounds/sfx-touch.wav',
};

/** BGM 파일 경로 */
const BGM_URLS: Record<BGMKey, string> = {
  'main-room': '/sounds/bgm-main-room.wav',
};

// ─── 전역 싱글턴 상태 ───────────────────────────────────────────────────────
let _audioCtx: AudioContext | null = null;
let _bgmSource: AudioBufferSourceNode | null = null;
let _bgmGain: GainNode | null = null;
let _bgmBuffer: AudioBuffer | null = null;
let _bgmKey: BGMKey | null = null;
let _bgmPlaying = false; // 실제 재생 중 여부 (source.onended 로 관리)
const _bufferCache: Partial<Record<SoundKey, AudioBuffer>> = {};
const _loading: Partial<Record<SoundKey, boolean>> = {};

// 볼륨/음소거 전역 값 (localStorage에서 초기화)
let _volume: number = (() => {
  try {
    const v = parseFloat(localStorage.getItem('pocket-egg-volume') ?? '0.7');
    return isNaN(v) ? 0.7 : Math.min(1, Math.max(0, v));
  } catch { return 0.7; }
})();
let _isMuted: boolean = (() => {
  try { return localStorage.getItem('pocket-egg-muted') === 'true'; } catch { return false; }
})();

// 구독자 목록 (React 컴포넌트 리렌더링 트리거)
type Listener = () => void;
const _listeners = new Set<Listener>();
function _notify() { _listeners.forEach(fn => fn()); }

// BGM GainNode 볼륨 즉시 반영
function _applyVolumeToBGM() {
  if (_bgmGain) {
    _bgmGain.gain.value = _isMuted ? 0 : _volume * 0.6;
  }
}

// ─── 백그라운드/포그라운드 처리 ─────────────────────────────────────────────
/** 앱이 백그라운드로 이동할 때: AudioContext suspend (소리 완전 정지) */
function _handleBackground() {
  if (_audioCtx && _audioCtx.state === 'running') {
    _audioCtx.suspend().catch(() => {});
  }
}

/** 앱이 포그라운드로 복귀할 때: AudioContext resume (소리 재개) */
function _handleForeground() {
  if (_audioCtx && _audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
}

// 백그라운드 이벤트 리스너 등록 (모듈 로드 시 1회만 실행)
let _bgListenersRegistered = false;
function _registerBackgroundListeners() {
  if (_bgListenersRegistered) return;
  _bgListenersRegistered = true;

  // 1) Page Visibility API — 웹/PWA/크롬 탭 전환, 화면 잠금
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      _handleBackground();
    } else {
      _handleForeground();
    }
  });

  // 2) Capacitor App 이벤트 — Android 네이티브 앱 백그라운드/포그라운드
  try {
    // Capacitor가 사용 가능한 환경에서만 등록
    const { App: CapApp } = require('@capacitor/app');
    CapApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        _handleForeground();
      } else {
        _handleBackground();
      }
    });
  } catch {
    // 웹 환경에서는 Capacitor App 플러그인 없음 — 무시
  }
}

// 모듈 로드 시 즉시 등록
_registerBackgroundListeners();
// ────────────────────────────────────────────────────────────────────────────

function getAudioCtx(): AudioContext {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume();
  }
  return _audioCtx;
}

async function loadBuffer(key: SoundKey): Promise<AudioBuffer | null> {
  if (_bufferCache[key]) return _bufferCache[key]!;
  if (_loading[key]) return null;
  _loading[key] = true;
  try {
    const ctx = getAudioCtx();
    const resp = await fetch(SOUND_URLS[key]);
    if (!resp.ok) throw new Error(`Failed to fetch ${key}`);
    const ab = await resp.arrayBuffer();
    const buf = await ctx.decodeAudioData(ab);
    _bufferCache[key] = buf;
    return buf;
  } catch (err) {
    console.warn(`[useSound] Failed to load sound: ${key}`, err);
    return null;
  } finally {
    _loading[key] = false;
  }
}

async function loadBGMBuffer(key: BGMKey): Promise<AudioBuffer | null> {
  if (_bgmBuffer) return _bgmBuffer;
  try {
    const ctx = getAudioCtx();
    const resp = await fetch(BGM_URLS[key]);
    if (!resp.ok) throw new Error(`Failed to fetch BGM: ${key}`);
    const ab = await resp.arrayBuffer();
    _bgmBuffer = await ctx.decodeAudioData(ab);
    return _bgmBuffer;
  } catch (err) {
    console.warn(`[useSound] Failed to load BGM: ${key}`, err);
    return null;
  }
}

// ─── React Hook ─────────────────────────────────────────────────────────────
interface UseSoundReturn {
  play: (key: SoundKey) => void;
  playBGM: (key: BGMKey) => void;
  stopBGM: () => void;
  isMuted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
}

export function useSound(): UseSoundReturn {
  // 전역 상태를 React state로 미러링 (리렌더링용)
  const [, forceUpdate] = useState(0);
  const listenerRef = useRef<Listener>(() => forceUpdate(n => n + 1));

  useEffect(() => {
    const fn = listenerRef.current;
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  // 효과음 재생
  const play = useCallback((key: SoundKey) => {
    if (_isMuted) return;
    (async () => {
      try {
        const ctx = getAudioCtx();
        // 백그라운드 상태면 재생하지 않음
        if (ctx.state === 'suspended') return;
        let buf = _bufferCache[key];
        if (!buf) buf = (await loadBuffer(key)) ?? undefined;
        if (!buf) return;
        const source = ctx.createBufferSource();
        source.buffer = buf;
        const gain = ctx.createGain();
        gain.gain.value = _volume;
        source.connect(gain);
        gain.connect(ctx.destination);
        source.start(0);
      } catch (err) {
        console.warn(`[useSound] play error: ${key}`, err);
      }
    })();
  }, []);

  // BGM 재생 (루프) — 이미 같은 BGM이 재생 중이면 중복 시작 방지
  const playBGM = useCallback((key: BGMKey) => {
    (async () => {
      try {
        // 이미 같은 BGM이 재생 중이면 볼륨만 갱신하고 종료
        if (_bgmPlaying && _bgmKey === key) {
          _applyVolumeToBGM();
          return;
        }

        // 기존 BGM 정지
        if (_bgmSource) {
          try { _bgmSource.stop(); } catch {}
          _bgmSource = null;
        }
        _bgmPlaying = false;

        const ctx = getAudioCtx();
        const buf = await loadBGMBuffer(key);
        if (!buf) return;

        // 비동기 로드 중 다른 BGM이 시작됐으면 중단
        if (_bgmPlaying && _bgmKey === key) return;

        // GainNode 생성 (없으면)
        if (!_bgmGain) {
          _bgmGain = ctx.createGain();
          _bgmGain.connect(ctx.destination);
        }
        _applyVolumeToBGM();

        const source = ctx.createBufferSource();
        source.buffer = buf;
        source.loop = true;
        source.connect(_bgmGain);
        source.start(0);
        source.onended = () => {
          // loop=true 이므로 정상 상황에서는 호출되지 않음
          // stop() 호출 시에만 발생 → 상태 초기화
          if (_bgmSource === source) {
            _bgmSource = null;
            _bgmPlaying = false;
          }
        };
        _bgmSource = source;
        _bgmKey = key;
        _bgmPlaying = true;
      } catch (err) {
        console.warn(`[useSound] playBGM error: ${key}`, err);
      }
    })();
  }, []);

  // BGM 정지
  const stopBGM = useCallback(() => {
    if (_bgmSource) {
      try { _bgmSource.stop(); } catch {}
      _bgmSource = null;
      _bgmKey = null;
      _bgmPlaying = false;
    }
  }, []);

  // 음소거 토글
  const toggleMute = useCallback(() => {
    _isMuted = !_isMuted;
    try { localStorage.setItem('pocket-egg-muted', String(_isMuted)); } catch {}
    _applyVolumeToBGM();
    _notify();
  }, []);

  // 볼륨 설정
  const setVolume = useCallback((v: number) => {
    _volume = Math.min(1, Math.max(0, v));
    // 볼륨을 올리면 자동으로 음소거 해제
    if (_volume > 0 && _isMuted) {
      _isMuted = false;
      try { localStorage.setItem('pocket-egg-muted', 'false'); } catch {}
    }
    try { localStorage.setItem('pocket-egg-volume', String(_volume)); } catch {}
    _applyVolumeToBGM();
    _notify();
  }, []);

  return {
    play,
    playBGM,
    stopBGM,
    isMuted: _isMuted,
    toggleMute,
    volume: _volume,
    setVolume,
  };
}
