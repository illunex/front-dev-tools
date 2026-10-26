import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { STATUS_BAR_STYLE } from '@/shared/config';
import { WebViewScreen } from '@/views/webview';

// 첫 렌더 직후 네이티브 스플래시가 자동으로 내려가면 웹이 뜰 때까지 빈 화면이 보인다.
// 자동으로 내리지 않고, SplashOverlay가 같은 화면을 덮은 뒤 직접 내린다.
void SplashScreen.preventAutoHideAsync();

export function App() {
  return (
    // Expo Router를 쓰지 않으므로 Provider를 직접 둔다. initialMetrics로 첫 렌더부터 inset을 알아 여백이 늦게 붙는 깜빡임을 막는다.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style={STATUS_BAR_STYLE} />
      <WebViewScreen />
    </SafeAreaProvider>
  );
}
