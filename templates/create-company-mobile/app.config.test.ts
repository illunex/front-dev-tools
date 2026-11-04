import type { ExpoConfig } from 'expo/config';

import { withDevelopmentHttpException } from './app.config';

const baseConfig: ExpoConfig = {
  name: 'Sample App',
  slug: 'sample-app',
  ios: { infoPlist: { ITSAppUsesNonExemptEncryption: false } },
};
const DEV_URL = 'http://192.168.0.10:3000/path';

function exceptionDomains(config: ExpoConfig) {
  return config.ios?.infoPlist?.NSAppTransportSecurity?.NSExceptionDomains;
}

describe('withDevelopmentHttpException', () => {
  it('production·preview 빌드에는 http 개발 URL이어도 예외를 넣지 않는다', () => {
    for (const buildProfile of ['production', 'preview']) {
      expect(withDevelopmentHttpException(baseConfig, { buildProfile, webViewUrl: DEV_URL })).toEqual(baseConfig);
    }
  });

  it('development 빌드에는 포트를 뺀 호스트로 HTTP 예외를 넣는다', () => {
    const config = withDevelopmentHttpException(baseConfig, { buildProfile: 'development', webViewUrl: DEV_URL });

    expect(exceptionDomains(config)).toEqual({ '192.168.0.10': { NSExceptionAllowsInsecureHTTPLoads: true } });
  });

  it('EAS 밖의 로컬 빌드(프로필 없음)도 개발 빌드로 보고 예외를 넣는다', () => {
    const config = withDevelopmentHttpException(baseConfig, { buildProfile: undefined, webViewUrl: DEV_URL });

    // 점이 경로 구분자로 읽히지 않게 배열 경로로 검사한다.
    expect(exceptionDomains(config)).toHaveProperty(['192.168.0.10']);
  });

  it('개발 URL이 https이거나 없으면 예외를 넣지 않는다', () => {
    expect(
      withDevelopmentHttpException(baseConfig, { buildProfile: 'development', webViewUrl: 'https://dev.example.com' }),
    ).toEqual(baseConfig);
    expect(withDevelopmentHttpException(baseConfig, { buildProfile: 'development', webViewUrl: undefined })).toEqual(
      baseConfig,
    );
  });

  it('기존 infoPlist 키를 보존하고 입력 객체를 바꾸지 않는다', () => {
    const snapshot = structuredClone(baseConfig);
    const config = withDevelopmentHttpException(baseConfig, { buildProfile: 'development', webViewUrl: DEV_URL });

    expect(config.ios?.infoPlist?.ITSAppUsesNonExemptEncryption).toBe(false);
    expect(baseConfig).toEqual(snapshot);
  });
});
