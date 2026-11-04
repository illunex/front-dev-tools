import { StyleSheet } from 'react-native';

import { APP_BACKGROUND_COLOR } from '@/shared/config';

export const styles = StyleSheet.create({
  // 스플래시 오버레이가 safe area 여백까지 화면 전체를 덮도록 여백이 없는 바깥 View에 둔다.
  root: {
    flex: 1,
    backgroundColor: APP_BACKGROUND_COLOR,
  },
  container: {
    flex: 1,
    backgroundColor: APP_BACKGROUND_COLOR,
  },
  webView: {
    flex: 1,
  },
});
