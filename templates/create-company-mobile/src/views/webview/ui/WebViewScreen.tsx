import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { WEBVIEW_URL } from '@/shared/config';

import { useWebViewBackHandler } from '../model/useWebViewBackHandler';
import { styles } from './style';

export function WebViewScreen() {
  const { webViewRef, handleNavigationStateChange } = useWebViewBackHandler();

  return (
    // 웹 페이지가 env(safe-area-inset-*)를 처리하지 않아도 되도록 상태바·홈 인디케이터 영역은 네이티브에서 비워 둔다.
    <SafeAreaView style={styles.container}>
      {/* react-native-webview 14 타입의 기본 제네릭(P = undefined)이 props를 never로 만들어 object를 명시한다. */}
      <WebView<object>
        ref={webViewRef}
        source={{ uri: WEBVIEW_URL }}
        style={styles.webView}
        onNavigationStateChange={handleNavigationStateChange}
      />
    </SafeAreaView>
  );
}
