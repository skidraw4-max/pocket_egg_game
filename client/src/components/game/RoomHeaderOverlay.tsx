/**
 * RoomHeaderOverlay — 방 배경 상단 프로필 + 상태 (배경 밝기 적응)
 */
import { useEffect, useMemo, useState } from 'react';
import type { PetProfile, PetStatus } from '@/lib/gameState';

export interface RoomHeaderOverlayProps {
  pet: PetProfile;
  status: PetStatus;
  wallpaperUrl: string;
  wallpaperReady: boolean;
  roomEditMode?: boolean;
  onProfileClick?: () => void;
}

type BgTone = 'light' | 'dark';

const STAT_ITEMS = [
  { key: 'hunger' as const, icon: '🍖', label: '배고픔', getValue: (s: PetStatus) => s.hunger },
  { key: 'mood' as const, icon: '😊', label: '기분', getValue: (s: PetStatus) => s.mood },
  { key: 'clean' as const, icon: '💧', label: '청결', getValue: (s: PetStatus) => s.clean },
  { key: 'fatigue' as const, icon: '💤', label: '피로', getValue: (s: PetStatus) => s.fatigue },
];

const THEME: Record<
  BgTone,
  {
    barBg: string;
    barBorder: string;
    nameColor: string;
    badgeBg: string;
    badgeColor: string;
    intimacyColor: string;
    statColor: string;
    statMuted: string;
    shadow: string;
  }
> = {
  light: {
    barBg: 'rgba(255,255,255,0.88)',
    barBorder: 'rgba(255,255,255,0.95)',
    nameColor: '#5B21B6',
    badgeBg: '#EDE9FE',
    badgeColor: '#7C3AED',
    intimacyColor: '#DB2777',
    statColor: '#374151',
    statMuted: '#6B7280',
    shadow: '0 2px 14px rgba(0,0,0,0.14)',
  },
  dark: {
    barBg: 'rgba(18,12,40,0.62)',
    barBorder: 'rgba(255,255,255,0.22)',
    nameColor: '#FFFFFF',
    badgeBg: 'rgba(124,58,237,0.45)',
    badgeColor: '#F5F3FF',
    intimacyColor: '#FBCFE8',
    statColor: '#FFFFFF',
    statMuted: 'rgba(255,255,255,0.75)',
    shadow: '0 2px 14px rgba(0,0,0,0.45)',
  },
};

function sampleWallpaperTone(url: string): Promise<BgTone> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const w = 48;
        const h = 24;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve('dark');
          return;
        }
        const srcH = Math.max(1, Math.floor(img.height * 0.22));
        ctx.drawImage(img, 0, 0, img.width, srcH, 0, 0, w, h);
        const { data } = ctx.getImageData(0, 0, w, h);
        let sum = 0;
        const pixels = data.length / 4;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        resolve(sum / pixels > 158 ? 'light' : 'dark');
      } catch {
        resolve('dark');
      }
    };
    img.onerror = () => resolve('dark');
    img.src = url;
  });
}

export default function RoomHeaderOverlay({
  pet,
  status,
  wallpaperUrl,
  wallpaperReady,
  roomEditMode = false,
  onProfileClick,
}: RoomHeaderOverlayProps) {
  const [tone, setTone] = useState<BgTone>('dark');

  useEffect(() => {
    if (!wallpaperReady || !wallpaperUrl) return;
    let cancelled = false;
    void sampleWallpaperTone(wallpaperUrl).then(t => {
      if (!cancelled) setTone(t);
    });
    return () => {
      cancelled = true;
    };
  }, [wallpaperUrl, wallpaperReady]);

  const theme = THEME[tone];

  const statValues = useMemo(
    () => STAT_ITEMS.map(item => ({ ...item, value: Math.round(item.getValue(status)) })),
    [status],
  );

  if (roomEditMode) return null;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex flex-col items-center px-3 pt-2 pointer-events-none">
      <div
        className="pointer-events-auto w-full max-w-md flex flex-col gap-1.5 rounded-2xl px-3 py-2 backdrop-blur-md"
        style={{
          background: theme.barBg,
          border: `1px solid ${theme.barBorder}`,
          boxShadow: theme.shadow,
        }}
      >
        <button
          type="button"
          onClick={onProfileClick}
          className="flex items-center justify-center gap-2 min-h-[32px] w-full rounded-xl transition-opacity active:opacity-80"
          title="프로필 보기"
        >
          <span className="text-sm">👤</span>
          <span
            className="text-sm font-extrabold truncate max-w-[120px]"
            style={{ fontFamily: 'Nunito, sans-serif', color: theme.nameColor }}
          >
            {pet.name}
          </span>
          <span
            className="text-xs font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: theme.badgeBg, color: theme.badgeColor }}
          >
            Lv.{pet.level}
          </span>
          <span className="text-xs font-bold shrink-0" style={{ color: theme.intimacyColor }}>
            ♥ {Math.floor(pet.intimacy)}
          </span>
        </button>

        <div className="flex items-center justify-between gap-1 px-0.5">
          {statValues.map(({ key, icon, label, value }) => (
            <div
              key={key}
              className="flex flex-1 items-center justify-center gap-0.5 min-w-0"
              title={label}
            >
              <span className="text-sm leading-none shrink-0">{icon}</span>
              <span
                className="text-[11px] font-extrabold tabular-nums truncate"
                style={{ fontFamily: 'Nunito, sans-serif', color: theme.statColor }}
              >
                {value}
                <span style={{ color: theme.statMuted, fontWeight: 700 }}>%</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
