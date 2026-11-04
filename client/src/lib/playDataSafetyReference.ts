/**

 * Google Play 「데이터 보안」 — APK/SDK와 콘솔 선언을 맞출 때 참고 (유지보수용)

 *

 * 거절 패턴: 「데이터 보안 양식 잘못됨」+ com.applovin:applovin-sdk / AD_ID

 * → 콘솔에서 「데이터 수집·공유 = 예」 후 아래 유형을 모두 선언하고, 변경사항 제출 후 AAB 재업로드

 */

import {

  ACCOUNT_DATA_DELETION_URL,

  PRIVACY_POLICY_URL,

} from './siteConfig';



/** 콘솔 「앱 콘텐츠 → 데이터 보안」에 넣을 URL (개인정보·계정 삭제 요청) */

export const PLAY_CONSOLE_URLS = {

  privacyPolicyUrl: PRIVACY_POLICY_URL,

  accountDeletionUrl: ACCOUNT_DATA_DELETION_URL,

} as const;



/** merged release manifest / build.gradle에 포함되는 주요 SDK */

export const PLAY_DATA_SAFETY_SDKS = [

  'Unity LevelPlay (ironSource) — capacitor-levelplay-ads',

  'com.applovin:applovin-sdk (+ mediation adapter)',

  'com.unity3d.ads:unity-ads',

  'com.pangle.global:pag-sdk',

  'Firebase Authentication, Realtime Database, Cloud Functions',

  'Google Play Billing (인앱 결제)',

  'Manifest: com.google.android.gms.permission.AD_ID',

] as const;



type DataTypeRef = {

  playCategory: string;

  collected: true;

  sharedWithThirdParties: true;

  encryptedInTransit: true;

  ephemeralProcessing: false;

  requiredCollection: 'required' | 'optional';

  purposes: readonly string[];

  sdkNote: string;

};



export const PLAY_DATA_SAFETY_REFERENCE = {

  /** 「기기 또는 기타 ID」 — 거절 시 가장 흔히 누락 */

  deviceOrOtherIds: {

    playCategory: '기기 또는 기타 ID',

    collected: true,

    sharedWithThirdParties: true,

    encryptedInTransit: true,

    ephemeralProcessing: false,

    requiredCollection: 'optional',

    purposes: ['Advertising or marketing'],

    sdkNote: 'GAID / AD_ID — LevelPlay, AppLovin, Unity Ads, Pangle',

  } satisfies DataTypeRef,

  userIds: {

    playCategory: '사용자 ID',

    collected: true,

    sharedWithThirdParties: true,

    encryptedInTransit: true,

    ephemeralProcessing: false,

    requiredCollection: 'required',

    purposes: ['App functionality', 'Account management'],

    sdkNote: 'Firebase Auth UID (익명·Google)',

  } satisfies DataTypeRef,

  appActivity: {

    playCategory: '앱 활동',

    collected: true,

    sharedWithThirdParties: true,

    encryptedInTransit: true,

    ephemeralProcessing: false,

    requiredCollection: 'required',

    purposes: ['App functionality'],

    sdkNote: 'Firebase RTDB — gameState, ranking, friends, visits',

  } satisfies DataTypeRef,

  purchaseHistory: {

    playCategory: '구매 내역',

    collected: true,

    sharedWithThirdParties: true,

    encryptedInTransit: true,

    ephemeralProcessing: false,

    requiredCollection: 'optional',

    purposes: ['App functionality'],

    sdkNote: 'Google Play + verifyPurchase Cloud Function',

  } satisfies DataTypeRef,

  otherInfoNickname: {

    playCategory: '기타 정보 (닉네임)',

    collected: true,

    sharedWithThirdParties: true,

    encryptedInTransit: true,

    ephemeralProcessing: false,

    requiredCollection: 'optional',

    purposes: ['App functionality'],

    sdkNote: '랭킹·친구 목록 표시용 닉네임',

  } satisfies DataTypeRef,

  consoleChecklist: [

    '「앱에서 필수 사용자 데이터 유형을 수집 또는 공유하나요?」→ 예',

    '「모든 데이터 암호화 전송?」→ 예',

    '계정 생성: OAuth(Google) + 기타(Firebase 익명 자동 생성)',

    '아동 대상 시 Play 가족 정책 준수 약속 표시 → 예',

    `개인정보 처리방침 URL → ${PRIVACY_POLICY_URL}`,

    `계정·데이터 삭제 요청 URL → ${ACCOUNT_DATA_DELETION_URL}`,

    '데이터 보안 양식 수정 후 「변경사항을 Google에 전송」 (AAB만 올리면 양식은 반영 안 됨)',

    '새 AAB는 versionCode를 이전 거절 버전보다 높게',

  ] as const,

} as const;


