// RN/Hermes의 URL 구현이 불완전해서 URL 객체 대신 정규식으로 origin만 뽑는다.
export function getOrigin(url: string): string | null {
  const origin = /^https?:\/\/[^/?#]+/i.exec(url)?.[0];
  return origin ? origin.toLowerCase() : null;
}

// 카카오 로그인·결제 페이지처럼 우리 웹이 아닌 페이지인지 origin만 비교한다.
// about:blank 등 http(s)가 아닌 URL은 외부로 보지 않아 앱 시작 시 배경이 깜빡이지 않게 한다.
export function isExternalPageUrl(url: string, appOrigin: string): boolean {
  const origin = getOrigin(url);
  return origin !== null && origin !== appOrigin.toLowerCase();
}
