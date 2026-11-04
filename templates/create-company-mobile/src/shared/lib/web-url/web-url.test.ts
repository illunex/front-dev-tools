import { getOrigin, isExternalPageUrl } from '.';

const APP_ORIGIN = 'https://example.com';

describe('getOrigin', () => {
  it('scheme·호스트·포트만 소문자로 뽑는다', () => {
    expect(getOrigin('HTTPS://Example.com:8080/a?b')).toBe('https://example.com:8080');
  });

  it('http(s)가 아니면 null이다', () => {
    expect(getOrigin('about:blank')).toBeNull();
    expect(getOrigin('intent://x#Intent;end')).toBeNull();
  });
});

describe('isExternalPageUrl', () => {
  it('우리 웹 페이지는 외부가 아니다', () => {
    expect(isExternalPageUrl('https://example.com/x', APP_ORIGIN)).toBe(false);
    expect(isExternalPageUrl('https://EXAMPLE.com/x', APP_ORIGIN)).toBe(false);
  });

  it('다른 origin은 외부 페이지다', () => {
    expect(isExternalPageUrl('https://accounts.kakao.com/login', APP_ORIGIN)).toBe(true);
    expect(isExternalPageUrl('https://example.com:8443/x', APP_ORIGIN)).toBe(true);
  });

  it('about:blank 같은 비 http(s) URL은 외부로 보지 않는다', () => {
    expect(isExternalPageUrl('about:blank', APP_ORIGIN)).toBe(false);
  });
});
