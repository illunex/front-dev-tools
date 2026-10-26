import { Linking } from 'react-native';

import { isWebViewLoadableUrl, openExternalAppUrl, parseIntentUrl } from '.';

const KAKAO_INTENT =
  'intent://login?x=1#Intent;scheme=kakaotalk;package=com.kakao.talk;S.browser_fallback_url=https%3A%2F%2Fk.com%2Ff;end';

describe('isWebViewLoadableUrl', () => {
  it('http(s)와 about은 웹뷰에서 연다', () => {
    expect(isWebViewLoadableUrl('HTTPS://a.com')).toBe(true);
    expect(isWebViewLoadableUrl('about:blank')).toBe(true);
  });

  it('앱 실행 URL은 웹뷰에서 열지 않는다', () => {
    expect(isWebViewLoadableUrl('intent://x')).toBe(false);
    expect(isWebViewLoadableUrl('kakaotalk://x')).toBe(false);
  });
});

describe('parseIntentUrl', () => {
  it('scheme·package·fallback URL을 뽑는다', () => {
    expect(parseIntentUrl(KAKAO_INTENT)).toEqual({
      appUrl: 'kakaotalk://login?x=1',
      packageName: 'com.kakao.talk',
      fallbackUrl: 'https://k.com/f',
    });
  });

  it('scheme이 없으면 appUrl은 null이다', () => {
    expect(parseIntentUrl('intent://login#Intent;package=com.kakao.talk;end').appUrl).toBeNull();
  });

  it('fallback URL 디코딩에 실패하면 원문을 쓴다', () => {
    expect(parseIntentUrl('intent://x#Intent;scheme=a;S.browser_fallback_url=%E0%A4%A;end').fallbackUrl).toBe(
      '%E0%A4%A',
    );
  });
});

describe('openExternalAppUrl', () => {
  const onFallbackUrl = jest.fn();
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    onFallbackUrl.mockReset();
    openURL = jest.spyOn(Linking, 'openURL');
    // 실패 경로의 개발 로그가 테스트 출력에 섞이지 않게 한다.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('intent가 아닌 앱 URL은 OS에 그대로 넘긴다', async () => {
    openURL.mockResolvedValue(undefined);

    await openExternalAppUrl('kakaotalk://x', onFallbackUrl);

    expect(openURL).toHaveBeenCalledWith('kakaotalk://x');
  });

  it('intent 앱 실행에 실패하면 fallback URL을 웹뷰로 넘긴다', async () => {
    openURL.mockRejectedValue(new Error('no app'));

    await openExternalAppUrl(KAKAO_INTENT, onFallbackUrl);

    expect(openURL).toHaveBeenCalledWith('kakaotalk://login?x=1');
    expect(onFallbackUrl).toHaveBeenCalledWith('https://k.com/f');
  });

  it('fallback이 없으면 Play 스토어 앱 페이지로 보낸다', async () => {
    openURL.mockRejectedValueOnce(new Error('no app')).mockResolvedValueOnce(undefined);

    await openExternalAppUrl('intent://login#Intent;scheme=kakaotalk;package=com.kakao.talk;end', onFallbackUrl);

    expect(openURL).toHaveBeenLastCalledWith('market://details?id=com.kakao.talk');
    expect(onFallbackUrl).not.toHaveBeenCalled();
  });
});
