import type { ConfigContext, ExpoConfig } from 'expo/config';

// 기본 설정은 app.json에 있고, 빌드 프로필에 따라 달라지는 값만 여기서 덧붙인다.
// SDK 58 config 로더는 이 파일에서 다른 TS 파일을 import하지 못하므로 헬퍼도 이 파일에 둔다.

interface BuildEnv {
  /** EAS_BUILD_PROFILE. EAS 밖의 로컬 빌드(pnpm ios 등)에서는 없다. */
  buildProfile?: string;
  webViewUrl?: string;
}

/**
 * 개발 웹 URL이 http면 WKWebView가 ATS로 막으므로 그 호스트만 HTTP 예외를 둔다.
 * 운영 빌드에 개발 서버 예외가 섞이지 않게 development 프로필과 로컬 빌드에서만 넣는다.
 * Android는 개발 빌드(debug)가 기본으로 cleartext를 허용해 따로 설정하지 않는다.
 */
export function withDevelopmentHttpException<T extends Partial<ExpoConfig>>(
  config: T,
  { buildProfile, webViewUrl }: BuildEnv,
): T {
  const isDevelopmentBuild = buildProfile === undefined || buildProfile === 'development';
  // ATS 예외 키는 포트 없는 호스트명이다.
  const host = webViewUrl ? /^http:\/\/([^/:?#]+)/i.exec(webViewUrl)?.[1] : undefined;
  if (!isDevelopmentBuild || !host) return config;

  const infoPlist = config.ios?.infoPlist ?? {};
  const appTransportSecurity = infoPlist.NSAppTransportSecurity ?? {};

  return {
    ...config,
    ios: {
      ...config.ios,
      infoPlist: {
        ...infoPlist,
        NSAppTransportSecurity: {
          ...appTransportSecurity,
          NSExceptionDomains: {
            ...appTransportSecurity.NSExceptionDomains,
            [host]: { NSExceptionAllowsInsecureHTTPLoads: true },
          },
        },
      },
    },
  };
}

export default ({ config }: ConfigContext) =>
  withDevelopmentHttpException(config, {
    buildProfile: process.env.EAS_BUILD_PROFILE,
    webViewUrl: process.env.EXPO_PUBLIC_WEBVIEW_URL,
  });
