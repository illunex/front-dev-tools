import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { BackHandler, Platform } from 'react-native';
import type { WebView, WebViewNavigation } from 'react-native-webview';

interface UseWebViewBackHandlerResult {
  webViewRef: RefObject<WebView<object> | null>;
  handleNavigationStateChange: (navigation: WebViewNavigation) => void;
}

// Android 하드웨어 뒤로가기를 웹 히스토리 back으로 연결하고, 더 돌아갈 곳이 없으면 기본 동작(앱 종료)에 맡긴다.
export function useWebViewBackHandler(): UseWebViewBackHandlerResult {
  const webViewRef = useRef<WebView<object>>(null);
  // 화면에 그리는 값이 아니므로 state 대신 ref로 보관해 네비게이션마다 리렌더되지 않게 한다.
  const canGoBackRef = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBackRef.current) return false;

      webViewRef.current?.goBack();
      return true;
    });

    return () => subscription.remove();
  }, []);

  const handleNavigationStateChange = useCallback(({ canGoBack }: WebViewNavigation) => {
    canGoBackRef.current = canGoBack;
  }, []);

  return { webViewRef, handleNavigationStateChange };
}
