import { parseBridgeMessage } from '.';

describe('parseBridgeMessage', () => {
  it('정의된 메시지만 돌려준다', () => {
    expect(parseBridgeMessage('{"action":"FIRST_PAINT"}')).toEqual({ action: 'FIRST_PAINT' });
  });

  it('JSON이 아니거나 모르는 action이면 null이다', () => {
    expect(parseBridgeMessage('not json')).toBeNull();
    expect(parseBridgeMessage('{"action":"UNKNOWN"}')).toBeNull();
  });

  it('객체가 아니면 null이다', () => {
    expect(parseBridgeMessage('"FIRST_PAINT"')).toBeNull();
    expect(parseBridgeMessage('null')).toBeNull();
    expect(parseBridgeMessage('["FIRST_PAINT"]')).toBeNull();
  });
});
