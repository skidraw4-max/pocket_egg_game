/**
 * RoomEditToolbar - 가구 배치 편집 패널 (Safe Edit Zone: stage와 겹치지 않음)
 */
import { useState } from 'react';
import type { PlacedDecor } from '@/lib/gameState';
import { getDecorMeta } from '@/lib/decorRegistry';
import { getWallpaperUrl, WALLPAPER_IDS } from '@/lib/roomAssets';
import { resolveDecorItems } from '@/components/game/RoomDecor';

interface RoomEditToolbarProps {
  wallpaperId: string;
  previewWallpaperId: string;
  ownedWallpapers: string[];
  furniture: string[];
  placements?: PlacedDecor[];
  hiddenDecor?: string[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onPreviewWallpaper: (id: string) => void;
  onScaleChange: (id: string, scale: number) => void;
  onFlip: (id: string) => void;
  onRotate: (id: string) => void;
  onZIndexChange: (id: string, delta: number) => void;
  onReset: (id: string) => void;
  onHide: (id: string) => void;
  onShow: (id: string) => void;
  onDone: () => void;
  onOpenGuide?: () => void;
}

const WALLPAPER_LABELS: Record<string, string> = {
  default: '기본',
  wallpaper_forest: '숲',
  wallpaper_ocean: '바다',
  wallpaper_cloud: '구름',
  wallpaper_candy: '과자',
};

export default function RoomEditToolbar({
  wallpaperId,
  previewWallpaperId,
  ownedWallpapers,
  furniture,
  placements,
  hiddenDecor,
  selectedId,
  onSelect,
  onPreviewWallpaper,
  onScaleChange,
  onFlip,
  onRotate,
  onZIndexChange,
  onReset,
  onHide,
  onShow,
  onDone,
  onOpenGuide,
}: RoomEditToolbarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = resolveDecorItems(furniture, previewWallpaperId, placements, hiddenDecor);
  const selected = visibleItems.find(i => i.id === selectedId);
  const selectedMeta = selectedId ? getDecorMeta(selectedId) : null;

  const previewOptions = WALLPAPER_IDS.filter(
    id => id === 'default' || ownedWallpapers.includes(id),
  );

  return (
    <div
      className="shrink-0 z-30 px-3 pt-2 pb-app-safe border-t border-purple-100 bg-white/95 backdrop-blur-md"
    >
      <div
        className="rounded-2xl px-3 py-3 space-y-3"
        style={{
          background: 'rgba(255,255,255,0.92)',
          boxShadow: '0 -2px 16px rgba(0,0,0,0.08)',
          border: '1.5px solid rgba(255,255,255,0.8)',
        }}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-purple-800 shrink-0">✏️ 방 꾸미기</p>
          <div className="flex items-center gap-2">
            {onOpenGuide && (
              <button
                type="button"
                onClick={onOpenGuide}
                className="w-8 h-8 rounded-full bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-bold transition-colors"
                title="편집 가이드"
              >
                ?
              </button>
            )}
            <button
              type="button"
              onClick={() => setCollapsed(c => !c)}
              className="px-3 py-1.5 rounded-full bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700 transition-colors"
            >
              {collapsed ? '▼ 펼치기' : '▲ 접기'}
            </button>
            <button
              type="button"
              onClick={onDone}
              className="px-4 py-1.5 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold transition-colors"
            >
              완료
            </button>
          </div>
        </div>

        {collapsed ? (
          <p className="text-[10px] text-gray-500">
            패널 접힘 · 가구를 탭해 선택한 뒤 방에서 드래그하세요
          </p>
        ) : (
          <p className="text-[10px] text-gray-500">
            가구 선택 → 드래그로 이동 · ▲ 접기하면 배치 공간이 넓어져요
          </p>
        )}

        {/* 가구 목록 — 접힘/펼침 공통 (선택은 항상 가능) */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleItems.map(item => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`shrink-0 w-12 h-12 rounded-xl text-2xl flex items-center justify-center transition-all ${
                selectedId === item.id
                  ? 'ring-2 ring-purple-500 bg-purple-50 scale-105'
                  : 'bg-gray-50 hover:bg-purple-50'
              }`}
              title={item.name}
            >
              {item.icon}
            </button>
          ))}
        </div>

        {!collapsed && (
          <div className="space-y-3 max-h-[38vh] overflow-y-auto">
            <div>
              <p className="text-[10px] text-gray-500 mb-1">배경 미리보기</p>
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {previewOptions.map(id => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onPreviewWallpaper(id)}
                    className={`shrink-0 w-14 h-10 rounded-lg bg-cover bg-center border-2 transition-all ${
                      previewWallpaperId === id ? 'border-purple-500 scale-105' : 'border-transparent opacity-80'
                    }`}
                    style={{ backgroundImage: `url(${getWallpaperUrl(id)})` }}
                    title={WALLPAPER_LABELS[id] ?? id}
                  />
                ))}
              </div>
              {previewWallpaperId !== wallpaperId && (
                <p className="text-[10px] text-purple-600 mt-1">
                  미리보기 중 · 완료 시 현재 배경({WALLPAPER_LABELS[wallpaperId]}) 유지
                </p>
              )}
            </div>

            {selected && selectedMeta && (
              <div className="space-y-2 border-t border-gray-100 pt-2">
                <p className="text-xs font-bold text-gray-700">{selectedMeta.name}</p>
                <label className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8 shrink-0">크기</span>
                  <input
                    type="range"
                    min={0.4}
                    max={2}
                    step={0.05}
                    value={selected.scale}
                    onChange={e => onScaleChange(selected.id, parseFloat(e.target.value))}
                    className="flex-1 accent-purple-500"
                  />
                  <span className="text-xs text-gray-400 w-10 text-right">{Math.round(selected.scale * 100)}%</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onFlip(selected.id)} className="py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">
                    ↔ 반전 {selected.flipX ? 'ON' : 'OFF'}
                  </button>
                  <button type="button" onClick={() => onRotate(selected.id)} className="py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">
                    ↻ 90° ({selected.rotation}°)
                  </button>
                  <button type="button" onClick={() => onZIndexChange(selected.id, 1)} className="py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">
                    ⬆ 앞으로 (z{selected.zIndex})
                  </button>
                  <button type="button" onClick={() => onZIndexChange(selected.id, -1)} className="py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-xs font-bold text-gray-700">
                    ⬇ 뒤로
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => onReset(selected.id)} className="py-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-xs font-bold text-purple-700">
                    ↺ preset 초기화
                  </button>
                  <button type="button" onClick={() => onHide(selected.id)} className="py-2 rounded-xl bg-red-50 hover:bg-red-100 text-xs font-bold text-red-600">
                    👁 방에서 숨기기
                  </button>
                </div>
              </div>
            )}

            {(hiddenDecor ?? []).length > 0 && (
              <div className="border-t border-gray-100 pt-2">
                <p className="text-[10px] text-gray-500 mb-1">숨긴 가구</p>
                <div className="flex gap-2 flex-wrap">
                  {(hiddenDecor ?? []).map(id => {
                    const meta = getDecorMeta(id);
                    if (!meta) return null;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onShow(id)}
                        className="px-2 py-1 rounded-lg bg-gray-100 text-xs font-bold text-gray-600 hover:bg-purple-50"
                      >
                        {meta.icon} {meta.name} 다시 표시
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
