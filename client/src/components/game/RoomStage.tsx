/**
 * RoomStage - 9:16 room 영역 (배경 + 가구)
 */
import { useEffect, useState } from 'react';
import type { PlacedDecor } from '@/lib/gameState';
import { getWallpaperUrl } from '@/lib/roomAssets';
import RoomDecor from '@/components/game/RoomDecor';

interface RoomStageProps {
  wallpaperId: string;
  furniture: string[];
  placements?: PlacedDecor[];
  hiddenDecor?: string[];
  editMode?: boolean;
  selectedDecorId?: string | null;
  onSelectDecor?: (id: string | null) => void;
  onMoveDecor?: (id: string, x: number, y: number) => void;
  className?: string;
  children?: React.ReactNode;
  onWallpaperReadyChange?: (ready: boolean) => void;
}

export default function RoomStage({
  wallpaperId,
  furniture,
  placements,
  hiddenDecor,
  editMode = false,
  selectedDecorId = null,
  onSelectDecor,
  onMoveDecor,
  className = '',
  children,
  onWallpaperReadyChange,
}: RoomStageProps) {
  const wallpaperUrl = getWallpaperUrl(wallpaperId);
  const [wallpaperReady, setWallpaperReady] = useState(false);

  useEffect(() => {
    setWallpaperReady(false);
    onWallpaperReadyChange?.(false);
    const img = new Image();
    img.onload = () => {
      setWallpaperReady(true);
      onWallpaperReadyChange?.(true);
    };
    img.onerror = () => {
      setWallpaperReady(false);
      onWallpaperReadyChange?.(false);
    };
    img.src = wallpaperUrl;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [wallpaperUrl, onWallpaperReadyChange]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700"
        style={{
          backgroundColor: '#F5EDE4',
          backgroundImage: wallpaperReady ? `url(${wallpaperUrl})` : undefined,
        }}
      />
      <div className="absolute inset-0 bg-[oklch(0.98_0.015_80)]/20 pointer-events-none" />
      <RoomDecor
        wallpaperId={wallpaperId}
        furniture={furniture}
        placements={placements}
        hiddenDecor={hiddenDecor}
        editMode={editMode}
        selectedId={selectedDecorId}
        onSelect={onSelectDecor}
        onMove={onMoveDecor}
      />
      {children}
    </div>
  );
}
