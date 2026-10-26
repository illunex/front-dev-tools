import { useCallback, useEffect, useState } from 'react';

// FIRST_PAINT·onLoadEnd가 끝내 오지 않아도(웹뷰 멈춤 등) 스플래시에 갇히지 않게 하는 상한.
const SPLASH_MAX_MS = 15000;

export function useSplashState() {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), SPLASH_MAX_MS);
    return () => clearTimeout(timer);
  }, []);

  // 리다이렉트 등으로 진행률이 다시 낮아져도 바가 뒤로 가지 않게 한다.
  const handleLoadProgress = useCallback((value: number) => {
    setProgress((previous) => Math.max(previous, value));
  }, []);

  const finish = useCallback(() => setDone(true), []);

  return { progress, done, handleLoadProgress, finish };
}
