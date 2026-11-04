/**
 * 웹 → 앱 메시지(window.ReactNativeWebView.postMessage(JSON.stringify(...))).
 * 새 메시지를 추가할 때는 이 유니온과 BRIDGE_ACTIONS에 함께 넣고, 웹 쪽 전송 코드와 action 이름을 맞춘다.
 */
export type BridgeMessage = { action: 'FIRST_PAINT' };

const BRIDGE_ACTIONS: readonly BridgeMessage['action'][] = ['FIRST_PAINT'];

function isBridgeAction(value: unknown): value is BridgeMessage['action'] {
  return BRIDGE_ACTIONS.some((action) => action === value);
}

// 웹이 보내는 값은 신뢰할 수 없으므로 정의된 형태만 통과시키고 나머지는 null로 버린다.
export function parseBridgeMessage(data: string): BridgeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) || !('action' in parsed)) {
    return null;
  }
  return isBridgeAction(parsed.action) ? { action: parsed.action } : null;
}
