/**
 * public/ 폴더 정적 에셋 URL (Vite base './' · Capacitor WebView 호환)
 * 루트 절대 경로(/characters/...)를 사용해 게임 시작 후에도 경로가 깨지지 않게 합니다.
 */
export function publicAssetUrl(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '');
  return `/${normalized}`;
}
