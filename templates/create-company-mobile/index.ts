import { registerRootComponent } from 'expo';

import { App } from './src/app';

// registerRootComponent는 AppRegistry.registerComponent('main', () => App)를 호출하고,
// 개발 빌드와 스토어 빌드 어디서 실행하든 환경을 맞춰 준다.
registerRootComponent(App);
