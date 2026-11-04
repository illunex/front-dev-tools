// 프로젝트 생성 때 입력한 배경색. 네이티브 스플래시(app.json expo-splash-screen)와 같은 값이어야
// 스플래시에서 앱 화면으로 넘어갈 때 색이 튀지 않는다. 바꿀 때는 두 곳을 함께 바꾼다.
export const APP_BACKGROUND_COLOR = '__CCM_BACKGROUND_COLOR__';

// 배경색 밝기로 정한 상태바 글자색(light = 밝은 글자).
export const STATUS_BAR_STYLE: 'light' | 'dark' = '__CCM_STATUS_BAR_STYLE__';

// 배경 위에 그리는 진행 바·버튼 글자 색.
export const APP_FOREGROUND_COLOR = STATUS_BAR_STYLE === 'light' ? '#FFFFFF' : '#111827';
