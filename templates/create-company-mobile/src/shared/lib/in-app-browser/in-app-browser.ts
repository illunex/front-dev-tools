import * as WebBrowser from 'expo-web-browser';
import { Linking, Platform } from 'react-native';

export interface InAppBrowserColors {
  toolbarColor: string;
  controlsColor: string;
}

/**
 * 웹이 window.open(url, "_blank")로 여는 외부 링크(뉴스 원문, 영수증 등)를 앱 위에 뜨는 브라우저 시트로 연다.
 * 웹뷰에서 그대로 열면 우리 화면이 외부 페이지로 바뀌어 뒤로가기로 되돌아와야 한다.
 * iOS는 SFSafariViewController, Android는 Chrome Custom Tabs라 웹뷰 쿠키·로그인 상태와 분리된다.
 */
export async function openInAppBrowser(url: string, colors: InAppBrowserColors): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'close',
      toolbarColor: colors.toolbarColor,
      controlsColor: colors.controlsColor,
      showTitle: true,
      enableBarCollapsing: true,
    });
  } catch (error) {
    if (__DEV__) console.log('[inAppBrowser] 인앱 브라우저 열기 실패', url, error);

    // Android는 Custom Tabs를 지원하는 브라우저가 없으면 실패하므로 기본 브라우저로 연다.
    // iOS 실패는 이미 시트가 떠 있는 경우(연타)라 무시한다.
    if (Platform.OS === 'android') {
      await Linking.openURL(url).catch(() => undefined);
    }
  }
}
