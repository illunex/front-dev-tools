import { buildInjectedJavaScript } from '.';

describe('buildInjectedJavaScript', () => {
  const script = buildInjectedJavaScript({ version: '1.0.0', platform: 'ios' });

  it('웹이 읽을 앱 정보를 window.__NATIVE_APP__로 주입한다', () => {
    expect(script).toContain('window.__NATIVE_APP__ = {"version":"1.0.0","platform":"ios"}');
  });

  it('첫 화면 표시(FCP)를 감지해 앱에 알린다', () => {
    expect(script).toContain('first-contentful-paint');
    expect(script).toContain('ReactNativeWebView.postMessage');
    expect(script).toContain('FIRST_PAINT');
  });

  it('웹뷰 주입 스크립트 규칙대로 true;로 끝난다', () => {
    expect(script.trimEnd().endsWith('true;')).toBe(true);
  });
});
