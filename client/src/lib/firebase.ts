import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, type User } from 'firebase/auth';
import { getDatabase, ref, get, set, runTransaction } from 'firebase/database';

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
export const db = getDatabase(app);

/** 익명 로그인 후 User 반환. 이미 로그인 중이면 현재 유저 반환 */
export async function ensureAnonymousAuth(): Promise<User> {
  if (auth.currentUser) return auth.currentUser;
  const cred = await signInAnonymously(auth);
  return cred.user;
}

/** 인증 상태 변경 구독 */
export function onAuthChanged(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

/**
 * 게임 내 5자리 숫자 ID 발급
 * - 이미 발급된 경우 기존 ID 반환
 * - 신규인 경우 중복 없이 랜덤 5자리 발급 후 Firebase에 저장
 */
export async function ensureGameId(uid: string): Promise<string> {
  // 이미 발급된 ID가 있으면 반환
  const existingSnap = await get(ref(db, `players/${uid}/profile/gameId`));
  if (existingSnap.exists()) {
    return existingSnap.val() as string;
  }

  // 최대 20회 시도로 중복 없는 ID 발급
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = String(Math.floor(Math.random() * 90000) + 10000); // 10000~99999
    const mapRef = ref(db, `userIds/${candidate}`);

    let assigned = false;
    await runTransaction(mapRef, (current) => {
      if (current === null) {
        assigned = true;
        return uid; // 해당 숫자 ID → UID 매핑 등록
      }
      return; // 이미 사용 중 → 트랜잭션 중단
    });

    if (assigned) {
      // 플레이어 프로필에도 저장
      await set(ref(db, `players/${uid}/profile/gameId`), candidate);
      return candidate;
    }
  }

  // 폴백: UID 앞 5자리 사용
  const fallback = uid.replace(/\D/g, '').slice(0, 5).padStart(5, '0');
  await set(ref(db, `players/${uid}/profile/gameId`), fallback);
  return fallback;
}

/**
 * 숫자 게임 ID로 Firebase UID 역조회
 */
export async function lookupUidByGameId(gameId: string): Promise<string | null> {
  const normalized = gameId.replace('#', '').trim();
  try {
    const snap = await get(ref(db, `userIds/${normalized}`));
    if (snap.exists()) return snap.val() as string;
  } catch (e) {
    console.warn('[Firebase] lookupUidByGameId 실패:', e);
  }
  return null;
}
