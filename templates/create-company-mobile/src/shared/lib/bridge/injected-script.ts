export interface NativeAppInfo {
  version: string;
  platform: string;
}

// 웹이 첫 화면을 그린 시점(FCP)을 앱에 알려 스플래시를 내린다.
// onLoadEnd(load 이벤트)는 이미지 등 하위 리소스까지 기다려서 화면이 이미 보인 뒤에 늦게 올 수 있다.
const FIRST_PAINT_NOTIFIER = `
  (function () {
    try {
      new PerformanceObserver(function (list, observer) {
        if (list.getEntriesByName("first-contentful-paint").length === 0) return;
        observer.disconnect();
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ action: "FIRST_PAINT" }));
        }
      }).observe({ type: "paint", buffered: true });
    } catch (e) {}
  })();
`;

/**
 * 웹 문서보다 먼저 실행할 스크립트(injectedJavaScriptBeforeContentLoaded).
 * 웹이 앱 버전·플랫폼을 읽을 수 있게 window.__NATIVE_APP__을 둔다.
 * UA에 버전을 붙이면 구글 OAuth가 웹뷰 UA를 차단할 수 있어 JS 주입 방식을 쓴다.
 * 웹뷰 주입 스크립트는 마지막 값이 true여야 해서 true;로 끝낸다.
 */
export function buildInjectedJavaScript(appInfo: NativeAppInfo): string {
  return `
  window.__NATIVE_APP__ = ${JSON.stringify({ version: appInfo.version, platform: appInfo.platform })};
${FIRST_PAINT_NOTIFIER}
  true;
`;
}
