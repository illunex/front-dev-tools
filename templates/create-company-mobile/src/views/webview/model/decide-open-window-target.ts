import { isWebViewLoadableUrl } from '@/shared/lib/external-app-url';
import { isExternalPageUrl } from '@/shared/lib/web-url';

export type OpenWindowTarget = 'external-app' | 'in-app-browser' | 'webview' | 'ignore';

interface OpenWindowContext {
  targetUrl: string;
  /** 새 창을 요청한 시점에 웹뷰가 보고 있던 페이지 */
  currentUrl: string;
  appOrigin: string;
}

/**
 * 웹의 window.open / target="_blank" 요청을 어디서 열지 정한다. 같은 창 이동(카카오·구글 로그인 등)은 여기로 오지 않는다.
 * - 앱 실행 URL(intent:, kakaotalk: 등) → OS에 넘긴다.
 * - 우리 웹이 연 외부 링크(뉴스 원문 등) → 인앱 브라우저. 우리 화면이 외부 페이지로 바뀌지 않게 한다.
 * - 외부 페이지(결제·인증)가 연 창 → 흐름의 일부일 수 있어 웹뷰에서 연다.
 * - 우리 웹 페이지 → 인앱 브라우저에는 웹뷰 쿠키가 없어 로그아웃 상태로 보이므로 웹뷰에서 연다.
 */
export function decideOpenWindowTarget({ targetUrl, currentUrl, appOrigin }: OpenWindowContext): OpenWindowTarget {
  if (!isWebViewLoadableUrl(targetUrl)) return 'external-app';
  if (!isExternalPageUrl(currentUrl, appOrigin) && isExternalPageUrl(targetUrl, appOrigin)) return 'in-app-browser';
  if (/^https?:/i.test(targetUrl)) return 'webview';
  return 'ignore';
}
