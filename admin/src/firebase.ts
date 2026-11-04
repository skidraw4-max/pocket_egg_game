import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const functions = getFunctions(app, 'us-central1');

export function onAuthChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  return signOut(auth);
}

export interface AdminPlayerPet {
  name?: string;
  level?: number;
  stage?: string;
  species?: string;
  exp?: number;
  expToNext?: number;
  intimacy?: number;
  traits?: {
    power?: number;
    intelligence?: number;
    charm?: number;
    vitality?: number;
  };
}

export interface AdminPlayerStatus {
  hunger?: number;
  mood?: number;
  clean?: number;
  fatigue?: number;
}

export interface AdminPlayerLookupResult {
  uid: string;
  profile: {
    gameId?: string;
    [key: string]: unknown;
  };
  nickname: string;
  coins: number;
  gems: number;
  inventory: Array<{ id: string; quantity: number }>;
  pet: AdminPlayerPet | null;
  status: AdminPlayerStatus | null;
  friendCoins: number;
  lastSaveTime: number | null;
  _savedAt: number | null;
}

export interface AdminGrantInput {
  targetUid: string;
  reason: string;
  grants: {
    coins?: number;
    gems?: number;
    friendCoins?: number;
    items?: Array<{ id: string; quantity: number }>;
  };
}

export interface AdminGrantResult {
  success: true;
  targetUid: string;
  applied: AdminGrantInput['grants'];
  balances: {
    coins: number;
    gems: number;
    friendCoins: number;
    inventory: Array<{ id: string; quantity: number }>;
  };
}

export interface AdminStatUpdates {
  nickname?: string;
  pet?: Partial<AdminPlayerPet> & {
    traits?: Partial<NonNullable<AdminPlayerPet['traits']>>;
  };
  status?: Partial<AdminPlayerStatus>;
}

export interface AdminUpdateStatsInput {
  targetUid: string;
  reason: string;
  updates: AdminStatUpdates;
}

export interface AdminUpdateStatsResult {
  success: true;
  targetUid: string;
  applied: AdminStatUpdates;
  pet: AdminPlayerPet | null;
  status: AdminPlayerStatus | null;
  nickname: string;
  lastSaveTime: number;
  _savedAt: number;
}

export async function adminLookupPlayer(query: string): Promise<AdminPlayerLookupResult> {
  const callable = httpsCallable<{ query: string }, AdminPlayerLookupResult>(
    functions,
    'adminLookupPlayer',
  );
  const result = await callable({ query });
  return result.data;
}

export async function adminGrantRewards(input: AdminGrantInput): Promise<AdminGrantResult> {
  const callable = httpsCallable<AdminGrantInput, AdminGrantResult>(
    functions,
    'adminGrantRewards',
  );
  const result = await callable(input);
  return result.data;
}

export async function adminUpdatePlayerStats(
  input: AdminUpdateStatsInput,
): Promise<AdminUpdateStatsResult> {
  const callable = httpsCallable<AdminUpdateStatsInput, AdminUpdateStatsResult>(
    functions,
    'adminUpdatePlayerStats',
  );
  const result = await callable(input);
  return result.data;
}

export const ADMIN_ITEM_OPTIONS = [
  { id: 'food_basic', label: '포켓 사료' },
  { id: 'food_cookie', label: '꿀방울 쿠키' },
  { id: 'food_salad', label: '잎사귀 샐러드' },
  { id: 'food_cake', label: '무지개 케이크' },
  { id: 'food_rainbow_snack', label: '무지개 간식' },
  { id: 'food_star_growth_snack', label: '별빛 성장 간식' },
  { id: 'toy_ball', label: '무지개 공' },
  { id: 'toy_puzzle', label: '별 퍼즐' },
  { id: 'toy_ribbon', label: '리본 장난감' },
  { id: 'toy_leaf', label: '잎사귀 장난감' },
  { id: 'fragment_rainbow', label: '무지개 조각' },
  { id: 'fragment_sparkle', label: '반짝 조각' },
] as const;

export const PET_STAGE_OPTIONS = [
  { value: 'egg', label: '알 (egg)' },
  { value: 'baby', label: '아기 (baby)' },
  { value: 'child', label: '어린이 (child)' },
  { value: 'teen', label: '청소년 (teen)' },
  { value: 'adult', label: '성체 (adult)' },
  { value: 'mythic', label: '신화 (mythic)' },
] as const;

export interface AdminRoomLayoutsResult {
  layouts: Record<string, Record<string, unknown>> | null;
}

export interface AdminSaveRoomLayoutsInput {
  wallpaperId: string;
  placements: Record<string, unknown>;
  reason?: string;
}

export async function adminGetRoomLayouts(): Promise<AdminRoomLayoutsResult> {
  const callable = httpsCallable<Record<string, never>, AdminRoomLayoutsResult>(
    functions,
    'adminGetRoomLayouts',
  );
  const result = await callable({});
  return result.data;
}

export async function adminSaveRoomLayouts(input: AdminSaveRoomLayoutsInput): Promise<{ success: true }> {
  const callable = httpsCallable<AdminSaveRoomLayoutsInput, { success: true }>(
    functions,
    'adminSaveRoomLayouts',
  );
  const result = await callable(input);
  return result.data;
}
