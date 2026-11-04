import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, View } from 'react-native';

import { APP_BACKGROUND_COLOR, APP_FOREGROUND_COLOR, STATUS_BAR_STYLE } from '@/shared/config';

// app.json expo-splash-screen의 imageWidth와 같아야 네이티브 스플래시에서 넘어갈 때 로고가 움직이지 않는다.
const LOGO_SIZE = 200;

// 네이티브 스플래시는 상태바·내비게이션 바까지 포함한 화면 전체의 가운데에 로고를 그린다.
// 앱이 edge-to-edge로 화면 맨 위부터 그려진다는 전제에서 화면 전체 높이 기준으로 같은 자리에 둔다.
const LOGO_TOP = (Dimensions.get('screen').height - LOGO_SIZE) / 2;
const LOGO_LEFT = (Dimensions.get('screen').width - LOGO_SIZE) / 2;

const BAR_WIDTH = 64;
const BAR_HEIGHT = 3;
const BAR_TOP = LOGO_SIZE / 2 + 25;
const TRACK_COLOR = STATUS_BAR_STYLE === 'light' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(17, 24, 39, 0.12)';

// 로고 onLoadEnd가 오지 않으면 네이티브 스플래시가 영영 안 내려가므로 이 시간이 지나면 강제로 내린다.
const NATIVE_SPLASH_FALLBACK_MS = 1000;

interface SplashOverlayProps {
  /** 웹뷰 로딩 진행률(0~1) */
  progress: number;
  /** true가 되면 바를 끝까지 채우고 페이드아웃한 뒤 사라진다. */
  done: boolean;
}

/**
 * 네이티브 스플래시와 똑같이 생긴 화면을 JS로 덮고, 웹이 첫 화면을 그릴 때까지 진행 바와 함께 유지한다.
 * 네이티브 스플래시는 정적 이미지라 진행률을 그릴 수 없어서, 이 화면이 뜨는 즉시 네이티브 스플래시를 내린다.
 */
export function SplashOverlay({ progress, done }: SplashOverlayProps) {
  // Animated 값은 한 번만 만들고 render 중 ref를 읽지 않도록 useState 초기화 함수로 둔다(React Compiler 규칙).
  const [progressValue] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => void SplashScreen.hideAsync(), NATIVE_SPLASH_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: done ? 1 : progress,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [progress, done, progressValue]);

  useEffect(() => {
    if (!done) return;

    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      // 바가 끝까지 차는 걸 보여준 뒤 사라지게 한다.
      delay: 150,
      useNativeDriver: true,
    }).start(() => setHidden(true));
  }, [done, opacity]);

  if (hidden) return null;

  const fillTranslateX = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-BAR_WIDTH, 0],
  });

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.container, { opacity }]} pointerEvents={done ? 'none' : 'auto'}>
      <View style={styles.logoBox}>
        <Image
          source={require('../../../../assets/splash-icon.png')}
          style={styles.logo}
          resizeMode="contain"
          // 로고가 그려지기 전에 네이티브 스플래시를 내리면 빈 배경이 한 프레임 비친다.
          onLoadEnd={() => void SplashScreen.hideAsync()}
        />
        <View style={styles.track}>
          <Animated.View style={[styles.fill, { transform: [{ translateX: fillTranslateX }] }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: APP_BACKGROUND_COLOR,
  },
  logoBox: {
    position: 'absolute',
    top: LOGO_TOP,
    left: LOGO_LEFT,
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
  track: {
    position: 'absolute',
    top: BAR_TOP,
    left: (LOGO_SIZE - BAR_WIDTH) / 2,
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: TRACK_COLOR,
    overflow: 'hidden',
  },
  fill: {
    width: BAR_WIDTH,
    height: BAR_HEIGHT,
    borderRadius: BAR_HEIGHT / 2,
    backgroundColor: APP_FOREGROUND_COLOR,
  },
});
