import { FormEvent, useEffect, useState } from 'react';
import {
  ADMIN_ITEM_OPTIONS,
  PET_STAGE_OPTIONS,
  adminGrantRewards,
  adminLookupPlayer,
  adminUpdatePlayerStats,
  logout,
  type AdminPlayerLookupResult,
  type AdminPlayerStatus,
} from '../firebase';

interface GrantPageProps {
  adminEmail: string | null;
}

interface ItemGrantRow {
  id: string;
  quantity: string;
}

interface StatsFormState {
  nickname: string;
  petName: string;
  level: string;
  stage: string;
  exp: string;
  expToNext: string;
  intimacy: string;
  hunger: string;
  mood: string;
  clean: string;
  fatigue: string;
}

const EMPTY_STATS_FORM: StatsFormState = {
  nickname: '',
  petName: '',
  level: '',
  stage: 'egg',
  exp: '',
  expToNext: '',
  intimacy: '',
  hunger: '',
  mood: '',
  clean: '',
  fatigue: '',
};

function getFirebaseErrorMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '요청에 실패했습니다.');
  }
  return '요청에 실패했습니다.';
}

function formatSavedAt(savedAt: number | null | undefined): string {
  if (!savedAt || !Number.isFinite(savedAt)) return '—';
  return new Date(savedAt).toLocaleString('ko-KR');
}

function buildStatsForm(player: AdminPlayerLookupResult): StatsFormState {
  const pet = player.pet ?? {};
  const status = player.status ?? {};
  return {
    nickname: player.nickname ?? '',
    petName: pet.name ?? '',
    level: pet.level !== undefined ? String(pet.level) : '',
    stage: pet.stage ?? 'egg',
    exp: pet.exp !== undefined ? String(pet.exp) : '',
    expToNext: pet.expToNext !== undefined ? String(pet.expToNext) : '',
    intimacy: pet.intimacy !== undefined ? String(pet.intimacy) : '',
    hunger: status.hunger !== undefined ? String(status.hunger) : '',
    mood: status.mood !== undefined ? String(status.mood) : '',
    clean: status.clean !== undefined ? String(status.clean) : '',
    fatigue: status.fatigue !== undefined ? String(status.fatigue) : '',
  };
}

function StatusBar({ label, value }: { label: string; value: number | undefined }) {
  const safeValue = Number.isFinite(Number(value)) ? Math.max(0, Math.min(100, Number(value))) : 0;
  return (
    <div className="status-bar-row">
      <div className="status-bar-header">
        <span>{label}</span>
        <span>{safeValue}</span>
      </div>
      <div className="status-bar-track">
        <div className="status-bar-fill" style={{ width: `${safeValue}%` }} />
      </div>
    </div>
  );
}

export default function GrantPage({ adminEmail }: GrantPageProps) {
  const [query, setQuery] = useState('');
  const [player, setPlayer] = useState<AdminPlayerLookupResult | null>(null);
  const [coins, setCoins] = useState('');
  const [gems, setGems] = useState('');
  const [friendCoins, setFriendCoins] = useState('');
  const [reason, setReason] = useState('');
  const [itemRows, setItemRows] = useState<ItemGrantRow[]>([]);
  const [statsForm, setStatsForm] = useState<StatsFormState>(EMPTY_STATS_FORM);
  const [statsReason, setStatsReason] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [grantLoading, setGrantLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [statsSuccess, setStatsSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (player) {
      setStatsForm(buildStatsForm(player));
    } else {
      setStatsForm(EMPTY_STATS_FORM);
    }
  }, [player]);

  async function handleSearch(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setStatsError(null);
    setStatsSuccess(null);
    setSearchLoading(true);
    try {
      const result = await adminLookupPlayer(query.trim());
      setPlayer(result);
    } catch (err) {
      setPlayer(null);
      setError(getFirebaseErrorMessage(err));
    } finally {
      setSearchLoading(false);
    }
  }

  function addItemRow() {
    setItemRows((rows) => [...rows, { id: ADMIN_ITEM_OPTIONS[0].id, quantity: '1' }]);
  }

  function updateItemRow(index: number, patch: Partial<ItemGrantRow>) {
    setItemRows((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function removeItemRow(index: number) {
    setItemRows((rows) => rows.filter((_, i) => i !== index));
  }

  function updateStatsField(field: keyof StatsFormState, value: string) {
    setStatsForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleGrant(event: FormEvent) {
    event.preventDefault();
    if (!player) {
      setError('먼저 플레이어를 검색하세요.');
      return;
    }

    setError(null);
    setSuccess(null);
    setGrantLoading(true);

    try {
      const grants: {
        coins?: number;
        gems?: number;
        friendCoins?: number;
        items?: Array<{ id: string; quantity: number }>;
      } = {};

      if (coins.trim()) grants.coins = Number(coins);
      if (gems.trim()) grants.gems = Number(gems);
      if (friendCoins.trim()) grants.friendCoins = Number(friendCoins);

      const items = itemRows
        .map((row) => ({
          id: row.id,
          quantity: Number(row.quantity),
        }))
        .filter((row) => Number.isFinite(row.quantity) && row.quantity > 0);

      if (items.length > 0) grants.items = items;

      const result = await adminGrantRewards({
        targetUid: player.uid,
        reason: reason.trim(),
        grants,
      });

      setPlayer({
        ...player,
        coins: result.balances.coins,
        gems: result.balances.gems,
        friendCoins: result.balances.friendCoins,
        inventory: result.balances.inventory,
      });
      setCoins('');
      setGems('');
      setFriendCoins('');
      setReason('');
      setItemRows([]);
      setSuccess('보상 지급이 완료되었습니다.');
    } catch (err) {
      setError(getFirebaseErrorMessage(err));
    } finally {
      setGrantLoading(false);
    }
  }

  async function handleStatsUpdate(event: FormEvent) {
    event.preventDefault();
    if (!player) {
      setStatsError('먼저 플레이어를 검색하세요.');
      return;
    }

    setStatsError(null);
    setStatsSuccess(null);
    setStatsLoading(true);

    try {
      const updates: {
        nickname?: string;
        pet?: {
          name?: string;
          level?: number;
          stage?: string;
          exp?: number;
          expToNext?: number;
          intimacy?: number;
        };
        status?: Partial<AdminPlayerStatus>;
      } = {};

      updates.nickname = statsForm.nickname.trim();

      const pet: NonNullable<typeof updates.pet> = {
        stage: statsForm.stage,
      };

      if (statsForm.petName.trim()) pet.name = statsForm.petName.trim();

      const currentLevel = player.pet?.level;
      const nextLevel = statsForm.level.trim() ? Number(statsForm.level) : undefined;
      const levelChanged = nextLevel !== undefined && nextLevel !== currentLevel;

      if (nextLevel !== undefined) pet.level = nextLevel;

      if (statsForm.exp.trim()) {
        const exp = Number(statsForm.exp);
        if (!levelChanged || exp !== player.pet?.exp) {
          pet.exp = exp;
        }
      }
      if (statsForm.expToNext.trim()) {
        const expToNext = Number(statsForm.expToNext);
        if (!levelChanged || expToNext !== player.pet?.expToNext) {
          pet.expToNext = expToNext;
        }
      }

      if (statsForm.intimacy.trim()) pet.intimacy = Number(statsForm.intimacy);

      updates.pet = pet;

      const status: Partial<AdminPlayerStatus> = {};
      if (statsForm.hunger.trim()) status.hunger = Number(statsForm.hunger);
      if (statsForm.mood.trim()) status.mood = Number(statsForm.mood);
      if (statsForm.clean.trim()) status.clean = Number(statsForm.clean);
      if (statsForm.fatigue.trim()) status.fatigue = Number(statsForm.fatigue);
      if (Object.keys(status).length > 0) {
        updates.status = status;
      }

      const result = await adminUpdatePlayerStats({
        targetUid: player.uid,
        reason: statsReason.trim(),
        updates,
      });

      setPlayer({
        ...player,
        nickname: result.nickname,
        pet: result.pet,
        status: result.status,
        lastSaveTime: result.lastSaveTime,
        _savedAt: result._savedAt,
      });
      setStatsReason('');
      setStatsSuccess('레벨·스탯 수정이 완료되었습니다.');
    } catch (err) {
      setStatsError(getFirebaseErrorMessage(err));
    } finally {
      setStatsLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
  }

  const currentStatus = player?.status ?? null;

  return (
    <div className="page">
      <div className="header">
        <div>
          <h1>보상 지급</h1>
          <p className="subtitle">{adminEmail ?? '관리자'}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={handleLogout}>
          로그아웃
        </button>
      </div>

      <div className="card">
        <h2>플레이어 검색</h2>
        <form onSubmit={handleSearch}>
          <label htmlFor="query">게임 ID (5자리) 또는 UID</label>
          <div className="row">
            <input
              id="query"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="예: 12345"
              required
            />
            <button type="submit" className="btn-primary" disabled={searchLoading}>
              {searchLoading ? '검색 중…' : '검색'}
            </button>
          </div>
        </form>

        {player && (
          <div>
            <div className="player-summary">
              <div className="stat">
                <div className="stat-label">게임 ID</div>
                <div className="stat-value">{player.profile.gameId ?? '—'}</div>
              </div>
              <div className="stat">
                <div className="stat-label">UID</div>
                <div className="stat-value" style={{ fontSize: '0.75rem', wordBreak: 'break-all' }}>
                  {player.uid}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">플레이어 닉네임</div>
                <div className="stat-value">{player.nickname || '—'}</div>
              </div>
              <div className="stat">
                <div className="stat-label">반려몬</div>
                <div className="stat-value">
                  {player.pet?.name ?? '—'} Lv.{player.pet?.level ?? '?'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">진화 단계</div>
                <div className="stat-value">{player.pet?.stage ?? '—'}</div>
              </div>
              <div className="stat">
                <div className="stat-label">경험치</div>
                <div className="stat-value">
                  {player.pet?.exp ?? 0} / {player.pet?.expToNext ?? '—'}
                </div>
              </div>
              <div className="stat">
                <div className="stat-label">코인</div>
                <div className="stat-value">{player.coins.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-label">젬</div>
                <div className="stat-value">{player.gems.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-label">친구 코인</div>
                <div className="stat-value">{player.friendCoins.toLocaleString()}</div>
              </div>
              <div className="stat">
                <div className="stat-label">마지막 저장</div>
                <div className="stat-value" style={{ fontSize: '0.85rem' }}>
                  {formatSavedAt(player._savedAt ?? player.lastSaveTime)}
                </div>
              </div>
            </div>

            {currentStatus && (
              <div className="status-bars">
                <StatusBar label="배고픔" value={currentStatus.hunger} />
                <StatusBar label="기분" value={currentStatus.mood} />
                <StatusBar label="청결" value={currentStatus.clean} />
                <StatusBar label="피로" value={currentStatus.fatigue} />
              </div>
            )}

            {player.inventory.length > 0 && (
              <ul className="inventory-list">
                {player.inventory.map((slot) => (
                  <li key={slot.id}>
                    {slot.id} × {slot.quantity}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>레벨 · 스탯 수정</h2>
        <p className="muted">
          레벨 1~999 · 상태값(배고픔/기분/청결/피로/친밀도) 0~100 · 젬/코인과 별도로 동작합니다.
        </p>

        {statsError && <div className="error">{statsError}</div>}
        {statsSuccess && <div className="success">{statsSuccess}</div>}

        <form onSubmit={handleStatsUpdate}>
          <div className="row">
            <div>
              <label htmlFor="stats-nickname">플레이어 닉네임</label>
              <input
                id="stats-nickname"
                value={statsForm.nickname}
                onChange={(e) => updateStatsField('nickname', e.target.value)}
                placeholder="소셜/랭킹 표시명"
                maxLength={20}
                disabled={!player}
              />
            </div>
            <div>
              <label htmlFor="stats-pet-name">반려몬 이름</label>
              <input
                id="stats-pet-name"
                value={statsForm.petName}
                onChange={(e) => updateStatsField('petName', e.target.value)}
                placeholder="반려몬 이름"
                maxLength={20}
                disabled={!player}
              />
            </div>
          </div>

          <div className="row">
            <div>
              <label htmlFor="stats-level">레벨</label>
              <input
                id="stats-level"
                type="number"
                min="1"
                max="999"
                value={statsForm.level}
                onChange={(e) => updateStatsField('level', e.target.value)}
                disabled={!player}
              />
              <p className="muted" style={{ marginTop: '0.35rem', fontSize: '0.85rem' }}>
                레벨 변경 시 경험치가 해당 레벨 시작값(0)으로 자동 설정됩니다.
              </p>
            </div>
            <div>
              <label htmlFor="stats-stage">진화 단계</label>
              <select
                id="stats-stage"
                value={statsForm.stage}
                onChange={(e) => updateStatsField('stage', e.target.value)}
                disabled={!player}
              >
                {PET_STAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="stats-exp">경험치 (exp)</label>
              <input
                id="stats-exp"
                type="number"
                min="0"
                max="999999"
                value={statsForm.exp}
                onChange={(e) => updateStatsField('exp', e.target.value)}
                disabled={!player}
              />
            </div>
            <div>
              <label htmlFor="stats-exp-next">다음 레벨 필요 exp</label>
              <input
                id="stats-exp-next"
                type="number"
                min="1"
                max="999999"
                value={statsForm.expToNext}
                onChange={(e) => updateStatsField('expToNext', e.target.value)}
                disabled={!player}
              />
            </div>
          </div>

          <div className="row">
            <div>
              <label htmlFor="stats-intimacy">친밀도</label>
              <input
                id="stats-intimacy"
                type="number"
                min="0"
                max="100"
                value={statsForm.intimacy}
                onChange={(e) => updateStatsField('intimacy', e.target.value)}
                disabled={!player}
              />
            </div>
            <div>
              <label htmlFor="stats-hunger">배고픔</label>
              <input
                id="stats-hunger"
                type="number"
                min="0"
                max="100"
                value={statsForm.hunger}
                onChange={(e) => updateStatsField('hunger', e.target.value)}
                disabled={!player}
              />
            </div>
            <div>
              <label htmlFor="stats-mood">기분</label>
              <input
                id="stats-mood"
                type="number"
                min="0"
                max="100"
                value={statsForm.mood}
                onChange={(e) => updateStatsField('mood', e.target.value)}
                disabled={!player}
              />
            </div>
            <div>
              <label htmlFor="stats-clean">청결</label>
              <input
                id="stats-clean"
                type="number"
                min="0"
                max="100"
                value={statsForm.clean}
                onChange={(e) => updateStatsField('clean', e.target.value)}
                disabled={!player}
              />
            </div>
            <div>
              <label htmlFor="stats-fatigue">피로</label>
              <input
                id="stats-fatigue"
                type="number"
                min="0"
                max="100"
                value={statsForm.fatigue}
                onChange={(e) => updateStatsField('fatigue', e.target.value)}
                disabled={!player}
              />
            </div>
          </div>

          <label htmlFor="stats-reason">수정 사유 (필수)</label>
          <textarea
            id="stats-reason"
            value={statsReason}
            onChange={(e) => setStatsReason(e.target.value)}
            placeholder="예: CS 복구, 테스트 계정 조정"
            required
            disabled={!player}
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={statsLoading || !player}
          >
            {statsLoading ? '수정 중…' : '스탯/레벨 수정'}
          </button>
        </form>
      </div>

      <div className="card">
        <h2>보상 지급</h2>
        <p className="muted">코인/젬/친구 코인 상한 100,000 · 아이템 수량 상한 999</p>

        {error && <div className="error">{error}</div>}
        {success && <div className="success">{success}</div>}

        <form onSubmit={handleGrant}>
          <div className="row">
            <div>
              <label htmlFor="coins">코인</label>
              <input
                id="coins"
                type="number"
                min="0"
                max="100000"
                value={coins}
                onChange={(e) => setCoins(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="gems">젬</label>
              <input
                id="gems"
                type="number"
                min="0"
                max="100000"
                value={gems}
                onChange={(e) => setGems(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label htmlFor="friendCoins">친구 코인</label>
              <input
                id="friendCoins"
                type="number"
                min="0"
                max="100000"
                value={friendCoins}
                onChange={(e) => setFriendCoins(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
              <label style={{ margin: 0 }}>아이템</label>
              <button type="button" className="btn-secondary" onClick={addItemRow}>
                아이템 추가
              </button>
            </div>

            {itemRows.map((row, index) => (
              <div className="item-row" key={`${row.id}-${index}`}>
                <div>
                  <label htmlFor={`item-${index}`}>종류</label>
                  <select
                    id={`item-${index}`}
                    value={row.id}
                    onChange={(e) => updateItemRow(index, { id: e.target.value })}
                  >
                    {ADMIN_ITEM_OPTIONS.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={`qty-${index}`}>수량</label>
                  <input
                    id={`qty-${index}`}
                    type="number"
                    min="1"
                    max="999"
                    value={row.quantity}
                    onChange={(e) => updateItemRow(index, { quantity: e.target.value })}
                  />
                </div>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={() => removeItemRow(index)}
                  aria-label="아이템 행 삭제"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <label htmlFor="reason">지급 사유 (필수)</label>
          <textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="예: CS 보상, 이벤트 당첨"
            required
          />

          <button
            type="submit"
            className="btn-primary"
            disabled={grantLoading || !player}
          >
            {grantLoading ? '지급 중…' : '보상 지급'}
          </button>
        </form>
      </div>
    </div>
  );
}
