import { getOrigin } from '../lib/web-url';

// EXPO_PUBLIC_ 변수는 빌드 시 정적 치환되므로 구조분해·대괄호 접근 없이 process.env.XXX로만 참조해야 한다.
const webViewUrl = process.env.EXPO_PUBLIC_WEBVIEW_URL;

if (!webViewUrl) {
  throw new Error(
    'EXPO_PUBLIC_WEBVIEW_URL이 설정되지 않았습니다. 로컬은 .env.development / .env.production, 클라우드 빌드는 EAS 환경 변수를 확인하세요.',
  );
}

const webViewOrigin = getOrigin(webViewUrl);

if (!webViewOrigin) {
  throw new Error(`EXPO_PUBLIC_WEBVIEW_URL은 http(s) 주소여야 합니다: ${webViewUrl}`);
}

export const WEBVIEW_URL = webViewUrl;
// 우리 웹인지 외부 페이지인지 가르는 기준. 새 창·배경 처리에서 쓴다.
export const WEBVIEW_ORIGIN = webViewOrigin;
