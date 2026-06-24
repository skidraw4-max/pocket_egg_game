/**
 * useSound - 「포켓 에그: 나만의 반려몬」 사운드 매니저
 * Cozy Nursery 디자인: 상황별 귀여운 효과음 재생
 *
 * 지원 효과음:
 * - eating   : 먹이 주기 (냠냠)
 * - playing  : 놀이 (신나게!)
 * - cleaning : 청소/목욕 (뽀득뽀득)
 * - sleeping : 수면 (쿨쿨)
 * - happy    : 행복 감정
 * - hungry   : 배고픔 감정
 * - dirty    : 더러움 감정
 * - tired    : 피곤함 감정
 * - love     : 사랑 감정 (친밀도 MAX)
 * - touch    : 터치/쓰다듬기
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

/** 효과음 파일 경로 (manus-storage) */
const SOUND_URLS: Record<SoundKey, string> = {
  eating:   '/manus-storage/sfx-eating_3f6b0c86.wav',
  playing:  '/manus-storage/sfx-playing_b0e85ebb.wav',
  cleaning: '/manus-storage/sfx-cleaning_fccb1436.wav',
  sleeping: '/manus-storage/sfx-sleeping_0a03d4b2.wav',
  happy:    '/manus-storage/sfx-happy_36fc5e1b.wav',
  hungry:   '/manus-storage/sfx-hungry_1ecc48db.wav',
  dirty:    '/manus-storage/sfx-dirty_3923ea20.wav',
  tired:    '/manus-storage/sfx-tired_815d4107.wav',
  love:     '/manus-storage/sfx-love_30559d35.wav',
  touch:    '/manus-storage/sfx-touch_5aae071d.wav',
};

/** 배경음악(BGM) 파일 경로 */
const BGM_URLS: Record<BGMKey, string> = {
  'main-room': '/manus-storage/bgm-main-room_2c8d5f4a.wav',
};

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
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
      return localStorage.getItem('pocket-egg-muted') === 'true';
    } catch {
      return false;
    }
  });
  const [volume, setVolumeState] = useState<number>(() => {
    try {
      const v = parseFloat(localStorage.getItem('pocket-egg-volume') ?? '0.7');
      return isNaN(v) ? 0.7 : Math.min(1, Math.max(0, v));
    } catch {
      return 0.7;
    }
  });

  // 오디오 버퍼 캐시 (Web Audio API)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const bufferCacheRef = useRef<Partial<Record<SoundKey, AudioBuffer>>>({});
  const loadingRef = useRef<Partial<Record<SoundKey, boolean>>>({});
  const bgmSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgmGainRef = useRef<GainNode | null>(null);
  const bgmBufferRef = useRef<AudioBuffer | null>(null);

  // AudioContext 초기화 (사용자 인터랙션 후 생성)
  const getAudioCtx = useCallback((): AudioContext => {
    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  // 효과음 버퍼 로드
  const loadBuffer = useCallback(async (key: SoundKey): Promise<AudioBuffer | null> => {
    if (bufferCacheRef.current[key]) return bufferCacheRef.current[key]!;
    if (loadingRef.current[key]) return null;

    loadingRef.current[key] = true;
    try {
      const ctx = getAudioCtx();
      const resp = await fetch(SOUND_URLS[key]);
      if (!resp.ok) throw new Error(`Failed to fetch ${key}`);
      const arrayBuffer = await resp.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      bufferCacheRef.current[key] = audioBuffer;
      return audioBuffer;
    } catch (err) {
      console.warn(`[useSound] Failed to load sound: ${key}`, err);
      return null;
    } finally {
      loadingRef.current[key] = false;
    }
  }, [getAudioCtx]);

  // 앱 로드 시 자주 쓰는 효과음 미리 로드
  useEffect(() => {
    const preload: SoundKey[] = ['eating', 'playing', 'cleaning', 'touch', 'happy'];
    preload.forEach((key) => {
      loadBuffer(key).catch(() => {});
    });
  }, [loadBuffer]);

  // BGM 버퍼 로드
  const loadBGMBuffer = useCallback(async (key: BGMKey): Promise<AudioBuffer | null> => {
    if (bgmBufferRef.current) return bgmBufferRef.current;
    try {
      const ctx = getAudioCtx();
      const resp = await fetch(BGM_URLS[key]);
      if (!resp.ok) throw new Error(`Failed to fetch BGM: ${key}`);
      const arrayBuffer = await resp.arrayBuffer();
      const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
      bgmBufferRef.current = audioBuffer;
      return audioBuffer;
    } catch (err) {
      console.warn(`[useSound] Failed to load BGM: ${key}`, err);
      return null;
    }
  }, [getAudioCtx]);

  // 효과음 재생
  const play = useCallback((key: SoundKey) => {
    if (isMuted) return;

    const playBuffer = async () => {
      try {
        const ctx = getAudioCtx();
        let buffer = bufferCacheRef.current[key];
        if (!buffer) {
          buffer = (await loadBuffer(key)) ?? undefined;
        }
        if (!buffer) return;

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        // 볼륨 노드
        const gainNode = ctx.createGain();
        gainNode.gain.value = volume;

        source.connect(gainNode);
        gainNode.connect(ctx.destination);
        source.start(0);
      } catch (err) {
        console.warn(`[useSound] Failed to play sound: ${key}`, err);
      }
    };

    playBuffer();
  }, [isMuted, volume, getAudioCtx, loadBuffer]);

  // BGM 재생 (루프)
  const playBGM = useCallback((key: BGMKey) => {
    const playAsync = async () => {
      try {
        // 기존 BGM 정지
        if (bgmSourceRef.current) {
          bgmSourceRef.current.stop();
          bgmSourceRef.current = null;
        }

        const ctx = getAudioCtx();
        let buffer = bgmBufferRef.current;
        if (!buffer) {
          buffer = await loadBGMBuffer(key);
        }
        if (!buffer) return;

        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        // 볼륨 노드 생성 또는 재사용
        if (!bgmGainRef.current) {
          bgmGainRef.current = ctx.createGain();
          bgmGainRef.current.connect(ctx.destination);
        }
        bgmGainRef.current.gain.value = isMuted ? 0 : volume * 0.6; // BGM은 효과음보다 낮게

        source.connect(bgmGainRef.current);
        source.start(0);
        bgmSourceRef.current = source;
      } catch (err) {
        console.warn(`[useSound] Failed to play BGM: ${key}`, err);
      }
    };
    playAsync();
  }, [isMuted, volume, getAudioCtx, loadBGMBuffer]);

  // BGM 정지
  const stopBGM = useCallback(() => {
    if (bgmSourceRef.current) {
      bgmSourceRef.current.stop();
      bgmSourceRef.current = null;
    }
  }, []);

  // 볼륨 변경 시 BGM 볼륨도 업데이트
  useEffect(() => {
    if (bgmGainRef.current) {
      bgmGainRef.current.gain.value = isMuted ? 0 : volume * 0.6;
    }
  }, [volume, isMuted]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try { localStorage.setItem('pocket-egg-muted', String(next)); } catch {}
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    try { localStorage.setItem('pocket-egg-volume', String(clamped)); } catch {}
  }, []);

  return { play, playBGM, stopBGM, isMuted, toggleMute, volume, setVolume };
}
