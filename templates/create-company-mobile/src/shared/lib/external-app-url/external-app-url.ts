import { Linking } from 'react-native';

// 웹뷰 안에서 그대로 로드할 스킴. 그 외(intent:, kakaotalk: 등 앱 실행 URL)는 OS에 넘긴다.
// react-native-webview 기본 originWhitelist(http/https + about:blank)와 같은 범위라 일반 페이지 동작은 바뀌지 않는다.
const WEBVIEW_SCHEMES = ['http:', 'https:', 'about:'];

export function isWebViewLoadableUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return WEBVIEW_SCHEMES.some((scheme) => lowerUrl.startsWith(scheme));
}

export interface ParsedIntentUrl {
  appUrl: string | null;
  packageName: string | null;
  fallbackUrl: string | null;
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * 안드로이드 intent URL을 RN Linking이 열 수 있는 커스텀 스킴 URL로 바꾼다.
 * 형식: intent://HOST#Intent;scheme=SCHEME;package=PKG;S.browser_fallback_url=URL;end
 * RN Linking은 ACTION_VIEW로만 열어서 intent: 스킴 자체를 처리할 앱이 없다.
 */
export function parseIntentUrl(url: string): ParsedIntentUrl {
  const withoutPrefix = url.replace(/^intent:(\/\/)?/i, '');
  const fragmentIndex = withoutPrefix.indexOf('#Intent;');
  const body = fragmentIndex === -1 ? withoutPrefix : withoutPrefix.slice(0, fragmentIndex);
  const fragment = fragmentIndex === -1 ? '' : withoutPrefix.slice(fragmentIndex + '#Intent;'.length);

  const params = new Map<string, string>();
  for (const pair of fragment.split(';')) {
    const index = pair.indexOf('=');
    if (index > 0) params.set(pair.slice(0, index), pair.slice(index + 1));
  }

  const scheme = params.get('scheme');
  const fallbackUrl = params.get('S.browser_fallback_url');

  return {
    appUrl: scheme ? `${scheme}://${body}` : null,
    packageName: params.get('package') ?? null,
    fallbackUrl: fallbackUrl ? safeDecodeURIComponent(fallbackUrl) : null,
  };
}

function logFailure(message: string, ...details: unknown[]) {
  if (__DEV__) console.log(`[externalAppUrl] ${message}`, ...details);
}

/**
 * 웹뷰가 열 수 없는 앱 실행 URL을 OS에 넘긴다(예: 카카오 로그인 페이지의 "카카오톡으로 로그인").
 * canOpenURL은 iOS LSApplicationQueriesSchemes·Android <queries> 등록이 있어야 true라서 거치지 않고 바로 연다.
 * 앱이 없으면 크롬과 같은 순서로 fallback URL(웹뷰에서 로드) → 스토어 순으로 대체한다.
 */
export async function openExternalAppUrl(url: string, onFallbackUrl: (fallbackUrl: string) => void): Promise<void> {
  if (!/^intent:/i.test(url)) {
    await Linking.openURL(url).catch((error: unknown) => logFailure('외부 앱 실행 실패', url, error));
    return;
  }

  const { appUrl, packageName, fallbackUrl } = parseIntentUrl(url);

  try {
    if (!appUrl) throw new Error('intent URL에 scheme이 없음');
    await Linking.openURL(appUrl);
  } catch (error) {
    logFailure('intent 실행 실패', url, error);

    if (fallbackUrl) {
      onFallbackUrl(fallbackUrl);
      return;
    }

    if (packageName) {
      await Linking.openURL(`market://details?id=${packageName}`).catch((marketError: unknown) =>
        logFailure('스토어 이동 실패', packageName, marketError),
      );
    }
  }
}
