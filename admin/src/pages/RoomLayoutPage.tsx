import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import {
  adminGetRoomLayouts,
  adminSaveRoomLayouts,
  logout,
} from '../firebase';
import {
  DECOR_OPTIONS,
  WALLPAPER_OPTIONS,
  type DecorLayoutMap,
  type LayoutPlacement,
} from '../roomLayoutData';

interface RoomLayoutPageProps {
  adminEmail: string | null;
  onBack: () => void;
}

function getErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '요청 실패');
  }
  return '요청 실패';
}

export default function RoomLayoutPage({ adminEmail, onBack }: RoomLayoutPageProps) {
  const [wallpaperId, setWallpaperId] = useState('default');
  const [layouts, setLayouts] = useState<Record<string, DecorLayoutMap>>({});
  const [selectedDecor, setSelectedDecor] = useState('decor_sofa');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);

  const currentMap = layouts[wallpaperId] ?? {};
  const placement = currentMap[selectedDecor] ?? { x: 0.5, y: 0.5, scale: 1, zIndex: 2 };
  const wallpaper = WALLPAPER_OPTIONS.find(w => w.id === wallpaperId) ?? WALLPAPER_OPTIONS[0];

  useEffect(() => {
    setLoading(true);
    adminGetRoomLayouts()
      .then(res => setLayouts((res.layouts ?? {}) as Record<string, DecorLayoutMap>))
      .catch(e => setMessage(getErrorMessage(e)))
      .finally(() => setLoading(false));
  }, []);

  const patchPlacement = useCallback((decorId: string, patch: Partial<LayoutPlacement>) => {
    setLayouts(prev => ({
      ...prev,
      [wallpaperId]: {
        ...(prev[wallpaperId] ?? {}),
        [decorId]: { ...(prev[wallpaperId]?.[decorId] ?? { x: 0.5, y: 0.5, scale: 1, zIndex: 2 }), ...patch },
      },
    }));
  }, [wallpaperId]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!stageRef.current) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: placement.x,
      origY: placement.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !stageRef.current) return;
    const rect = stageRef.current.getBoundingClientRect();
    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const clamp = (v: number) => Math.min(0.98, Math.max(0.02, v));
    patchPlacement(selectedDecor, {
      x: clamp(dragRef.current.origX + dx),
      y: clamp(dragRef.current.origY + dy),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      await adminSaveRoomLayouts({
        wallpaperId,
        placements: layouts[wallpaperId] ?? {},
        reason: 'Admin room layout preset update',
      });
      setMessage('저장됐습니다. 게임 클라이언트는 config/roomLayouts 구독으로 반영됩니다.');
    } catch (err) {
      setMessage(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const visibleDecors = DECOR_OPTIONS.filter(d => currentMap[d.id]);

  return (
    <div className="page">
      <div className="card" style={{ maxWidth: 960 }}>
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1>Room Layout Editor</h1>
            <p className="subtitle">{adminEmail} · Firebase config/roomLayouts</p>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="secondary" onClick={onBack}>← 보상/플레이어</button>
            <button type="button" className="secondary" onClick={() => logout()}>로그아웃</button>
          </div>
        </div>

        {loading ? (
          <p className="subtitle">불러오는 중…</p>
        ) : (
          <form onSubmit={handleSave} className="stack" style={{ marginTop: 16 }}>
            <label>
              배경 (wallpaper)
              <select value={wallpaperId} onChange={e => setWallpaperId(e.target.value)}>
                {WALLPAPER_OPTIONS.map(w => (
                  <option key={w.id} value={w.id}>{w.label}</option>
                ))}
              </select>
            </label>

            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              {DECOR_OPTIONS.map(d => (
                <button
                  key={d.id}
                  type="button"
                  className={selectedDecor === d.id ? '' : 'secondary'}
                  onClick={() => {
                    setSelectedDecor(d.id);
                    if (!currentMap[d.id]) {
                      patchPlacement(d.id, { x: 0.5, y: 0.5, scale: 1, zIndex: 2 });
                    }
                  }}
                >
                  {d.icon} {d.name}
                </button>
              ))}
            </div>

            <div
              ref={stageRef}
              className="room-stage"
              style={{ backgroundImage: `url(${wallpaper.url})` }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {visibleDecors.map(d => {
                const p = currentMap[d.id]!;
                return (
                  <div
                    key={d.id}
                    className={`room-decor ${selectedDecor === d.id ? 'selected' : ''}`}
                    style={{
                      left: `${p.x * 100}%`,
                      top: `${p.y * 100}%`,
                      fontSize: `${(p.scale ?? 1) * 48}px`,
                      zIndex: p.zIndex ?? 2,
                      transform: `translate(-50%, -50%) rotate(${p.rotation ?? 0}deg) scaleX(${p.flipX ? -1 : 1})`,
                    }}
                    onPointerDown={e => {
                      setSelectedDecor(d.id);
                      handlePointerDown(e);
                    }}
                  >
                    {d.icon}
                  </div>
                );
              })}
            </div>

            <div className="grid-2">
              <label>
                x ({Math.round(placement.x * 100)}%)
                <input type="range" min={0.02} max={0.98} step={0.01} value={placement.x}
                  onChange={e => patchPlacement(selectedDecor, { x: parseFloat(e.target.value) })} />
              </label>
              <label>
                y ({Math.round(placement.y * 100)}%)
                <input type="range" min={0.02} max={0.98} step={0.01} value={placement.y}
                  onChange={e => patchPlacement(selectedDecor, { y: parseFloat(e.target.value) })} />
              </label>
              <label>
                scale
                <input type="range" min={0.4} max={2} step={0.05} value={placement.scale ?? 1}
                  onChange={e => patchPlacement(selectedDecor, { scale: parseFloat(e.target.value) })} />
              </label>
              <label>
                z-index
                <input type="number" min={1} max={5} value={placement.zIndex ?? 2}
                  onChange={e => patchPlacement(selectedDecor, { zIndex: parseInt(e.target.value, 10) })} />
              </label>
            </div>

            <button type="submit" disabled={saving}>{saving ? '저장 중…' : `💾 ${wallpaper.label} preset 저장`}</button>
            {message && <p className="subtitle">{message}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
