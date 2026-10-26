import { decideOpenWindowTarget } from './decide-open-window-target';

const appOrigin = 'https://example.com';

describe('decideOpenWindowTarget', () => {
  it('앱 실행 URL은 외부 앱으로 넘긴다', () => {
    expect(
      decideOpenWindowTarget({
        targetUrl: 'intent://x#Intent;scheme=kakaotalk;end',
        currentUrl: 'https://example.com/a',
        appOrigin,
      }),
    ).toBe('external-app');
  });

  it('우리 웹에서 연 외부 링크는 인앱 브라우저로 연다', () => {
    expect(
      decideOpenWindowTarget({ targetUrl: 'https://news.com/1', currentUrl: 'https://example.com/a', appOrigin }),
    ).toBe('in-app-browser');
  });

  it('외부 페이지(결제 등)가 연 창은 흐름이 끊기지 않게 웹뷰에서 연다', () => {
    expect(
      decideOpenWindowTarget({ targetUrl: 'https://pay.toss.im/y', currentUrl: 'https://pay.toss.im/x', appOrigin }),
    ).toBe('webview');
  });

  it('우리 웹 페이지는 쿠키가 있는 웹뷰에서 연다', () => {
    expect(
      decideOpenWindowTarget({ targetUrl: 'https://example.com/b', currentUrl: 'https://example.com/a', appOrigin }),
    ).toBe('webview');
  });

  it('about:blank 같은 빈 창은 무시한다', () => {
    expect(decideOpenWindowTarget({ targetUrl: 'about:blank', currentUrl: 'https://example.com/a', appOrigin })).toBe(
      'ignore',
    );
  });
});
