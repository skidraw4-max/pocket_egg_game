/**

 * RoomDecor - Room Stage 내부 가구 렌더링

 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { PlacedDecor } from '@/lib/gameState';

import { getDecorMeta } from '@/lib/decorRegistry';

import { getLayoutPlacement } from '@/data/roomLayouts';

import { decorFontSizeRem } from '@/lib/roomAssets';



export interface ResolvedDecorItem {

  id: string;

  icon: string;

  name: string;

  x: number;

  y: number;

  scale: number;

  scaleX: number;

  scaleY: number;

  rotation: number;

  flipX: boolean;

  zIndex: number;

  animation: 'float' | 'sway' | 'twinkle' | 'none';

}



function resolveItem(

  decorId: string,

  wallpaperId: string,

  userPlacements?: PlacedDecor[],

): ResolvedDecorItem | null {

  const meta = getDecorMeta(decorId);

  if (!meta) return null;



  const user = userPlacements?.find(p => p.id === decorId);

  const preset = getLayoutPlacement(wallpaperId, decorId);

  if (!user && !preset) return null;



  if (user) {

    return {

      id: decorId,

      icon: meta.icon,

      name: meta.name,

      x: user.x,

      y: user.y,

      scale: user.scale,

      scaleX: preset?.scaleX ?? 1,

      scaleY: preset?.scaleY ?? 1,

      rotation: user.rotation ?? 0,

      flipX: user.flipX ?? false,

      zIndex: user.zIndex ?? preset?.zIndex ?? 2,

      animation: meta.animation,

    };

  }



  const p = preset!;

  return {

    id: decorId,

    icon: meta.icon,

    name: meta.name,

    x: p.x,

    y: p.y,

    scale: p.scale,

    scaleX: p.scaleX ?? 1,

    scaleY: p.scaleY ?? 1,

    rotation: p.rotation ?? 0,

    flipX: p.flipX ?? false,

    zIndex: p.zIndex ?? 2,

    animation: meta.animation,

  };

}



export function resolveDecorItems(

  furniture: string[],

  wallpaperId: string,

  placements?: PlacedDecor[],

  hiddenDecor?: string[],

  includeHidden = false,

): ResolvedDecorItem[] {

  if (!furniture?.length) return [];

  const hidden = new Set(hiddenDecor ?? []);

  return furniture

    .filter(id => includeHidden || !hidden.has(id))

    .map(id => resolveItem(id, wallpaperId, placements))

    .filter((item): item is ResolvedDecorItem => item != null)

    .sort((a, b) => a.zIndex - b.zIndex);

}



interface RoomDecorProps {

  wallpaperId: string;

  furniture: string[];

  placements?: PlacedDecor[];

  hiddenDecor?: string[];

  editMode?: boolean;

  selectedId?: string | null;

  onSelect?: (decorId: string | null) => void;

  onMove?: (decorId: string, x: number, y: number) => void;

  className?: string;

}



export default function RoomDecor({

  wallpaperId,

  furniture,

  placements,

  hiddenDecor,

  editMode = false,

  selectedId = null,

  onSelect,

  onMove,

  className = '',

}: RoomDecorProps) {

  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const stageRef = useRef<HTMLDivElement>(null);

  const [stageWidth, setStageWidth] = useState(360);



  useEffect(() => {

    const el = stageRef.current;

    if (!el) return;

    const ro = new ResizeObserver(entries => {

      const w = entries[0]?.contentRect.width;

      if (w && w > 0) setStageWidth(w);

    });

    ro.observe(el);

    setStageWidth(el.getBoundingClientRect().width || 360);

    return () => ro.disconnect();

  }, []);



  const items = resolveDecorItems(furniture, wallpaperId, placements, hiddenDecor);

  const clamp = (v: number) => Math.min(0.98, Math.max(0.02, v));



  const handlePointerDown = useCallback(

    (e: React.PointerEvent, item: ResolvedDecorItem) => {

      if (!editMode || !onMove) return;

      e.preventDefault();

      e.stopPropagation();

      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      dragRef.current = {

        id: item.id,

        startX: e.clientX,

        startY: e.clientY,

        origX: item.x,

        origY: item.y,

      };

      onSelect?.(item.id);

    },

    [editMode, onMove, onSelect],

  );



  const handlePointerMove = useCallback(

    (e: React.PointerEvent) => {

      if (!dragRef.current || !stageRef.current || !onMove) return;

      const rect = stageRef.current.getBoundingClientRect();

      onMove(

        dragRef.current.id,

        clamp(dragRef.current.origX + (e.clientX - dragRef.current.startX) / rect.width),

        clamp(dragRef.current.origY + (e.clientY - dragRef.current.startY) / rect.height),

      );

    },

    [onMove],

  );



  const handlePointerUp = useCallback(() => {

    dragRef.current = null;

  }, []);



  if (items.length === 0) return null;



  return (

    <div

      ref={stageRef}

      className={`absolute inset-0 ${className}`}

      onPointerMove={editMode ? handlePointerMove : undefined}

      onPointerUp={editMode ? handlePointerUp : undefined}

      onPointerCancel={editMode ? handlePointerUp : undefined}

      onClick={editMode ? () => onSelect?.(null) : undefined}

    >

      {items.map(item => {

        const animClass =

          !editMode && item.animation === 'float' ? 'animate-decor-float'

          : !editMode && item.animation === 'sway' ? 'animate-decor-sway'

          : !editMode && item.animation === 'twinkle' ? 'animate-decor-twinkle'

          : '';



        const flip = item.flipX ? -1 : 1;

        const fontSize = decorFontSizeRem(stageWidth, item.scale);

        const isSelected = editMode && selectedId === item.id;



        return (

          <div

            key={item.id}

            className={`absolute select-none ${editMode ? 'cursor-grab active:cursor-grabbing' : 'pointer-events-none'} ${animClass} ${isSelected ? 'ring-4 ring-purple-400/80 rounded-2xl' : ''}`}

            style={{

              left: `${item.x * 100}%`,

              top: `${item.y * 100}%`,

              fontSize,

              lineHeight: 1,

              zIndex: item.zIndex,

              transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scaleX(${flip * item.scaleX}) scaleY(${item.scaleY})`,

              transformOrigin: 'center center',

              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.22))',

              touchAction: editMode ? 'none' : undefined,

            }}

            title={item.name}

            onPointerDown={editMode ? e => handlePointerDown(e, item) : undefined}

            onClick={editMode ? e => e.stopPropagation() : undefined}

          >

            {item.icon}

          </div>

        );

      })}



      <style>{`

        @keyframes decor-float {

          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }

          50%       { transform: translate(-50%, -50%) translateY(-12px); }

        }

        @keyframes decor-sway {

          0%, 100% { transform: translate(-50%, -50%) rotate(-5deg); }

          50%       { transform: translate(-50%, -50%) rotate(5deg); }

        }

        @keyframes decor-twinkle {

          0%, 100% { opacity: 1; }

          30%       { opacity: 0.55; }

          60%       { opacity: 1; }

        }

        .animate-decor-float   { animation: decor-float   3s ease-in-out infinite; }

        .animate-decor-sway    { animation: decor-sway    4s ease-in-out infinite; }

        .animate-decor-twinkle { animation: decor-twinkle 2.5s ease-in-out infinite; }

      `}</style>

    </div>

  );

}


