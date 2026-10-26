import Constants from 'expo-constants';
import { useCallback, useState } from 'react';
import { Platform, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { APP_BACKGROUND_COLOR, APP_FOREGROUND_COLOR, WEBVIEW_ORIGIN, WEBVIEW_URL } from '@/shared/config';
import { buildInjectedJavaScript, parseBridgeMessage } from '@/shared/lib/bridge';
import { isWebViewLoadableUrl, openExternalAppUrl } from '@/shared/lib/external-app-url';
import { openInAppBrowser } from '@/shared/lib/in-app-browser';
import { isExternalPageUrl } from '@/shared/lib/web-url';
import { SplashOverlay } from '@/widgets/splash-overlay';

import { decideOpenWindowTarget } from '../model/decide-open-window-target';
import { useSplashState } from '../model/useSplashState';
import { useWebViewBackHandler } from '../model/useWebViewBackHandler';
import { styles } from './style';

// 앱 버전은 CNG라 app.json version 하나가 원본이다.
const INJECTED_JAVASCRIPT = buildInjectedJavaScript({
  version: Constants.expoConfig?.version ?? '0.0.0',
  platform: Platform.OS,
});

export function WebViewScreen() {
  const { webViewRef, handleNavigationStateChange } = useWebViewBackHandler();
  const { progress, done, handleLoadProgress, finish } = useSplashState();
  const [currentUrl, setCurrentUrl] = useState(WEBVIEW_URL);

  // 배경을 칠하지 않는 외부 페이지(카카오 인증 등)는 웹뷰 배경색이 그대로 비친다.
  // 라이트 모드면 브라우저 기본처럼 흰 배경을 깔아 어두운 앱 배경 위에 검정 글자가 묻히지 않게 한다.
  const colorScheme = useColorScheme();
  const webViewBackgroundColor =
    isExternalPageUrl(currentUrl, WEBVIEW_ORIGIN) && colorScheme !== 'dark' ? '#FFFFFF' : APP_BACKGROUND_COLOR;

  const loadInWebView = useCallback(
    (url: string) => {
      webViewRef.current?.injectJavaScript(`location.href = ${JSON.stringify(url)}; true;`);
    },
    [webViewRef],
  );

  const handleOpenWindow = (targetUrl: string) => {
    switch (decideOpenWindowTarget({ targetUrl, currentUrl, appOrigin: WEBVIEW_ORIGIN })) {
      case 'external-app':
        void openExternalAppUrl(targetUrl, loadInWebView);
        return;
      case 'in-app-browser':
        void openInAppBrowser(targetUrl, { toolbarColor: APP_BACKGROUND_COLOR, controlsColor: APP_FOREGROUND_COLOR });
        return;
      case 'webview':
        loadInWebView(targetUrl);
        return;
      case 'ignore':
        return;
    }
  };

  const handleMessage = ({ nativeEvent }: WebViewMessageEvent) => {
    const message = parseBridgeMessage(nativeEvent.data);
    if (message?.action === 'FIRST_PAINT') finish();
  };

  const handleNavigation = (navigation: WebViewNavigation) => {
    handleNavigationStateChange(navigation);
    setCurrentUrl(navigation.url);
  };

  return (
    <View style={styles.root}>
      {/* 웹 페이지가 env(safe-area-inset-*)를 처리하지 않아도 되도록 상태바·홈 인디케이터 영역은 네이티브에서 비워 둔다. */}
      <SafeAreaView style={styles.container}>
        {/* react-native-webview 14 타입의 기본 제네릭(P = undefined)이 props를 never로 만들어 object를 명시한다. */}
        <WebView<object>
          ref={webViewRef}
          source={{ uri: WEBVIEW_URL }}
          style={[styles.webView, { backgroundColor: webViewBackgroundColor }]}
          injectedJavaScriptBeforeContentLoaded={INJECTED_JAVASCRIPT}
          // HttpOnly 로그인 쿠키가 앱 종료 후에도 남도록 시스템 쿠키 저장소와 공유한다.
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          allowsBackForwardNavigationGestures
          // Android는 이 값이 true여야 window.open이 onOpenWindow로 넘어온다(false면 현재 웹뷰에서 열림).
          setSupportMultipleWindows
          onOpenWindow={({ nativeEvent }) => handleOpenWindow(nativeEvent.targetUrl)}
          // 기본 originWhitelist(http/https)면 라이브러리가 앱 실행 URL을 조용히 버려 onShouldStartLoadWithRequest까지 오지 않는다
          // ("카카오톡으로 로그인" 버튼 무반응 원인). 전부 받아서 직접 처리하므로 좁히지 않는다.
          originWhitelist={['*']}
          onShouldStartLoadWithRequest={({ url }) => {
            if (isWebViewLoadableUrl(url)) return true;

            void openExternalAppUrl(url, loadInWebView);
            return false;
          }}
          onNavigationStateChange={handleNavigation}
          onMessage={handleMessage}
          onLoadProgress={({ nativeEvent }) => handleLoadProgress(nativeEvent.progress)}
          // FIRST_PAINT가 오지 않는 경우(페인트 API 미지원, 로드 실패 등)에도 로드가 끝나면 스플래시를 내린다.
          onLoadEnd={finish}
          // iOS가 메모리 부족으로 웹 프로세스를 죽이면 흰 화면으로 남으므로 다시 불러온다.
          onContentProcessDidTerminate={() => webViewRef.current?.reload()}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
          textZoom={100}
        />
      </SafeAreaView>

      <SplashOverlay progress={progress} done={done} />
    </View>
  );
}
