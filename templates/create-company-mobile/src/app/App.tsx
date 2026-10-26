import { StatusBar } from 'expo-status-bar';
import { initialWindowMetrics, SafeAreaProvider } from 'react-native-safe-area-context';

import { STATUS_BAR_STYLE } from '@/shared/config';
import { WebViewScreen } from '@/views/webview';

export function App() {
  return (
    // Expo Router를 쓰지 않으므로 Provider를 직접 둔다. initialMetrics로 첫 렌더부터 inset을 알아 여백이 늦게 붙는 깜빡임을 막는다.
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <StatusBar style={STATUS_BAR_STYLE} />
      <WebViewScreen />
    </SafeAreaProvider>
  );
}
