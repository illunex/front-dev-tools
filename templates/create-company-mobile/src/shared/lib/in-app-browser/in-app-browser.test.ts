import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

import { openInAppBrowser } from '.';

jest.mock('expo-web-browser', () => ({
  openBrowserAsync: jest.fn(),
  WebBrowserPresentationStyle: { PAGE_SHEET: 'pageSheet' },
  WebBrowserResultType: { DISMISS: 'dismiss' },
}));

const openBrowserAsync = jest.mocked(WebBrowser.openBrowserAsync);
const COLORS = { toolbarColor: '#0B1220', controlsColor: '#FFFFFF' };

describe('openInAppBrowser', () => {
  let openURL: jest.SpyInstance;

  beforeEach(() => {
    openBrowserAsync.mockReset();
    openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    // 실패 경로의 개발 로그가 테스트 출력에 섞이지 않게 한다.
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    openURL.mockRestore();
    jest.restoreAllMocks();
  });

  it('앱 색상으로 인앱 브라우저를 연다', async () => {
    openBrowserAsync.mockResolvedValue({ type: WebBrowser.WebBrowserResultType.DISMISS });

    await openInAppBrowser('https://news.com/1', COLORS);

    expect(openBrowserAsync).toHaveBeenCalledWith(
      'https://news.com/1',
      expect.objectContaining({ toolbarColor: '#0B1220', controlsColor: '#FFFFFF' }),
    );
    expect(openURL).not.toHaveBeenCalled();
  });

  it('Android에서 실패하면 기본 브라우저로 연다', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    openBrowserAsync.mockRejectedValue(new Error('no custom tabs'));

    await openInAppBrowser('https://news.com/1', COLORS);

    expect(openURL).toHaveBeenCalledWith('https://news.com/1');
  });

  it('iOS에서 실패하면(시트 중복 등) 무시한다', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    openBrowserAsync.mockRejectedValue(new Error('already open'));

    await openInAppBrowser('https://news.com/1', COLORS);

    expect(openURL).not.toHaveBeenCalled();
  });
});
