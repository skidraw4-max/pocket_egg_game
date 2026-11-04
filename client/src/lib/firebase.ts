import { Capacitor } from '@capacitor/core';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  GoogleAuthProvider,
  linkWithCredential,
  signInWithCredential,
  signInWithPopup,
  linkWithPopup,
  type AuthCredential,
  type User,
} from 'firebase/auth';
import { getDatabase, ref, get, set, runTransaction } from 'firebase/database';
import { getFunctions, httpsCallable } from 'firebase/functions';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const functions = getFunctions(app, 'us-central1');

export interface VerifyGooglePlayPurchaseInput {
  productId: string;
  purchaseToken: string;
  transactionId?: string;
  purchaseId?: string;
  quantity?: number;
}

export interface VerifyGooglePlayPurchaseResult {
  success: true;
  alreadyGranted: boolean;
  productId: string;
  amount: number;
  quantity: number;
  purchaseKey: string;
  gems: number;
  grantedAt: number;
}

export async function verifyGooglePlayPurchase(
  input: VerifyGooglePlayPurchaseInput
): Promise<VerifyGooglePlayPurchaseResult> {
  const callable = httpsCallable<VerifyGooglePlayPurchaseInput, VerifyGooglePlayPurchaseResult>(
    functions,
    'verifyPurchaseAndGrantGems'
  );
  const result = await callable(input);
  return result.data;
}

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

export function isGoogleLinked(user: User | null = auth.currentUser): boolean {
  return user?.providerData.some((provider) => provider.providerId === GoogleAuthProvider.PROVIDER_ID) ?? false;
}

function getAuthErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const record = error as { code?: unknown; errorCode?: unknown };
  if (record.code != null) return String(record.code);
  if (record.errorCode != null) return String(record.errorCode);
  return undefined;
}

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message?: unknown }).message ?? '');
  }
  return '';
}

function isGoogleSignInCancelled(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessage(error).toLowerCase();
  return (
    code === 'auth/popup-closed-by-user'
    || code === 'auth/cancelled-popup-request'
    || code === 'auth/user-cancelled'
    || message.includes('cancel')
    || message.includes('취소')
  );
}

function isGoogleDeveloperConfigError(error: unknown): boolean {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessage(error);
  return (
    code === '10'
    || code === '12501'
    || message.includes('DEVELOPER_ERROR')
    || /(?:^|\D)10(?::|\s)/.test(message)
    || message.includes('ApiException: 10')
    || message.includes('default_web_client_id')
  );
}

function getGoogleAuthFailureMessage(error: unknown): string {
  const code = getAuthErrorCode(error);
  const message = getAuthErrorMessage(error);

  if (isGoogleSignInCancelled(error)) {
    return 'Google 로그인 창이 닫혀 연결을 취소했습니다.';
  }
  if (isGoogleDeveloperConfigError(error)) {
    return 'Google 로그인 설정이 아직 완료되지 않았습니다. Firebase Console에 Android 앱(com.pocketegg.game)의 SHA-1 지문을 등록하고 google-services.json을 다시 받아 빌드해 주세요.';
  }
  if (code === 'auth/credential-already-in-use' || code === 'auth/account-exists-with-different-credential') {
    return '이미 다른 저장 데이터에 연결된 Google 계정입니다. 현재 익명 데이터는 덮어쓰지 않았습니다. 기존 데이터를 불러오려면 아래의 "기존 Google 계정으로 복원"을 사용해 주세요.';
  }
  if (code === 'auth/provider-already-linked') {
    return '이미 Google 계정이 연결되어 있습니다.';
  }
  if (code === 'auth/invalid-credential' || code === 'auth/invalid-id-token') {
    return 'Google 인증 정보가 유효하지 않습니다. 앱을 완전히 종료한 뒤 다시 시도해 주세요.';
  }
  if (code === 'auth/operation-not-allowed') {
    return 'Firebase Console에서 Google 로그인 제공업체가 비활성화되어 있습니다. Authentication > Sign-in method에서 Google을 사용 설정해 주세요.';
  }
  if (code === 'auth/network-request-failed') {
    return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.';
  }
  if (message.includes('Google 인증 토큰을 받지 못했습니다')) {
    return message;
  }
  if (message) {
    return `Google 계정 처리 중 오류가 발생했습니다. (${message})`;
  }
  return 'Google 계정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

function toGoogleAuthCredential(
  idToken: string | null,
  accessToken: string | null,
): AuthCredential {
  if (!idToken && !accessToken) {
    throw new Error('Google 인증 토큰을 받지 못했습니다.');
  }
  return GoogleAuthProvider.credential(idToken, accessToken ?? undefined);
}

async function requestNativeGoogleSignIn(
  useCredentialManager: boolean,
): Promise<AuthCredential> {
  // Android Credential Manager는 scopes가 있으면 추가 OAuth 승인 단계를 거치며 실패하기 쉽다.
  // Firebase link/signIn에는 idToken만 있으면 충분하다.
  const result = await FirebaseAuthentication.signInWithGoogle({
    skipNativeAuth: true,
    useCredentialManager,
  });
  const idToken = result.credential?.idToken ?? null;
  const accessToken = result.credential?.accessToken ?? null;
  return toGoogleAuthCredential(idToken, accessToken);
}

async function getNativeGoogleCredential(): Promise<AuthCredential> {
  try {
    return await requestNativeGoogleSignIn(true);
  } catch (primaryError) {
    if (isGoogleSignInCancelled(primaryError)) {
      throw primaryError;
    }
    console.warn('[Firebase] Credential Manager Google sign-in 실패, classic flow 재시도:', primaryError);
    return requestNativeGoogleSignIn(false);
  }
}

export interface GoogleAccountResult {
  success: boolean;
  message: string;
  uid?: string;
}

/**
 * 현재 익명 계정에 Google 계정을 연결합니다.
 * 성공 시 Firebase UID가 유지되어 players/{uid}/gameState를 그대로 사용합니다.
 */
export async function linkGoogleAccount(): Promise<GoogleAccountResult> {
  try {
    const user = auth.currentUser ?? await ensureAnonymousAuth();
    if (isGoogleLinked(user)) {
      return { success: true, message: '이미 Google 계정이 연결되어 있습니다.', uid: user.uid };
    }

    if (Capacitor.isNativePlatform()) {
      const credential = await getNativeGoogleCredential();
      const linked = await linkWithCredential(user, credential);
      return { success: true, message: 'Google 계정이 연결되었습니다. 이제 다른 기기에서도 이어서 플레이할 수 있습니다.', uid: linked.user.uid };
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const linked = await linkWithPopup(user, provider);
    return { success: true, message: 'Google 계정이 연결되었습니다. 이제 다른 기기에서도 이어서 플레이할 수 있습니다.', uid: linked.user.uid };
  } catch (error) {
    console.warn('[Firebase] linkGoogleAccount 실패:', error);
    return { success: false, message: getGoogleAuthFailureMessage(error) };
  }
}

/**
 * 기존 Google 계정으로 로그인해 같은 UID의 클라우드 저장 데이터를 불러오도록 전환합니다.
 * 익명 계정 업그레이드 실패 시에만 사용자가 명시적으로 선택하는 복원 흐름입니다.
 */
export async function signInWithGoogleForRestore(): Promise<GoogleAccountResult> {
  try {
    if (Capacitor.isNativePlatform()) {
      const credential = await getNativeGoogleCredential();
      const signedIn = await signInWithCredential(auth, credential);
      return { success: true, message: 'Google 계정으로 로그인했습니다. 클라우드 저장 데이터를 불러오는 중입니다.', uid: signedIn.user.uid };
    }

    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');
    const signedIn = await signInWithPopup(auth, provider);
    return { success: true, message: 'Google 계정으로 로그인했습니다. 클라우드 저장 데이터를 불러오는 중입니다.', uid: signedIn.user.uid };
  } catch (error) {
    console.warn('[Firebase] signInWithGoogleForRestore 실패:', error);
    return { success: false, message: getGoogleAuthFailureMessage(error) };
  }
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

/**
 * 닉네임 정규화: 소문자 변환 + 공백 제거 (인덱스 키로 사용)
 * 예: '알 마스터' → '알마스터', 'EggHunter' → 'egghunter'
 */
export function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase().replace(/\s+/g, '');
}

/**
 * 닉네임 중복 여부 확인
 * @returns true = 이미 사용 중, false = 사용 가능
 */
export async function isNicknameTaken(nickname: string, myUid: string): Promise<boolean> {
  const key = normalizeNickname(nickname);
  if (!key) return false;
  try {
    const snap = await get(ref(db, `nicknames/${key}`));
    if (!snap.exists()) return false;
    const ownerUid = snap.val() as string;
    // 본인이 이미 사용 중인 닉네임이면 중복 아님
    return ownerUid !== myUid;
  } catch (e) {
    console.warn('[Firebase] isNicknameTaken 실패:', e);
    return false;
  }
}

/**
 * 닉네임 인덱스 등록 (트랜잭션으로 경쟁 조건 방지)
 * @returns true = 등록 성공, false = 이미 다른 사용자가 사용 중
 */
export async function registerNickname(
  nickname: string,
  uid: string,
  prevNickname?: string
): Promise<boolean> {
  const key = normalizeNickname(nickname);
  if (!key) return false;

  const nicknameRef = ref(db, `nicknames/${key}`);
  let success = false;

  await runTransaction(nicknameRef, (current) => {
    // 비어있거나 본인이 이미 소유 중이면 등록
    if (current === null || current === uid) {
      success = true;
      return uid;
    }
    // 다른 사람이 사용 중 → 트랜잭션 중단
    return;
  });

  if (success && prevNickname) {
    // 이전 닉네임 인덱스 해제
    const prevKey = normalizeNickname(prevNickname);
    if (prevKey && prevKey !== key) {
      try {
        const prevRef = ref(db, `nicknames/${prevKey}`);
        const prevSnap = await get(prevRef);
        // 본인 소유인 경우에만 삭제
        if (prevSnap.exists() && prevSnap.val() === uid) {
          await set(prevRef, null);
        }
      } catch (e) {
        console.warn('[Firebase] 이전 닉네임 해제 실패:', e);
      }
    }
  }

  return success;
}
