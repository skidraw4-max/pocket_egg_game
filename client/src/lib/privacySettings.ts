/**
 * Play 사용자 데이터 정책 — 앱 내 개인정보·광고 동의 접근
 */
import { PRIVACY_POLICY_URL } from './siteConfig';

export async function openPrivacyPolicy(): Promise<void> {
  window.open(PRIVACY_POLICY_URL, '_blank', 'noopener,noreferrer');
}

/** TNK Publisher — 광고·개인정보는 개인정보처리방침으로 안내 */
export async function openAdPrivacySettings(): Promise<void> {
  await openPrivacyPolicy();
}
