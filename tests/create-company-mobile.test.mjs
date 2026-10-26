import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

import {
  parseArgs,
  deriveSlug,
  isValidBundleId,
  statusBarStyleFor,
  resolveOptions,
  applyAppJson,
  applyPackageJson,
  applyTsconfig,
  applyGitignore,
  applyPnpmWorkspace,
  renderTokens,
  buildTokens,
  buildEnvFiles,
  sdkNotice,
  buildChecklist,
  RUNTIME_DEPENDENCIES,
} from "../scripts/create-company-mobile.mjs";

const CWD = "/work";
const notExists = () => false;
const validArgs = {
  ...parseArgs([]),
  name: "Sample App",
  bundleId: "com.illunex.sample",
  devUrl: "http://192.168.0.10:3000",
  prodUrl: "https://example.com",
  background: "#0B1220",
};

test("deriveSlug는 앱 이름을 kebab-case로 바꾼다", () => {
  assert.equal(deriveSlug("Sample App"), "sample-app");
  assert.equal(deriveSlug("  My--App 2 "), "my-app-2");
  assert.equal(deriveSlug("샘플앱"), "");
});

test("isValidBundleId는 Android 패키지 규칙을 따른다", () => {
  assert.equal(isValidBundleId("com.illunex.sample"), true);
  assert.equal(isValidBundleId("com.illunex"), true);
  assert.equal(isValidBundleId("sample"), false);
  assert.equal(isValidBundleId("com.1abc.app"), false);
  assert.equal(isValidBundleId("com.my-app.x"), false);
});

test("statusBarStyleFor는 어두운 배경에 light, 밝은 배경에 dark를 고른다", () => {
  assert.equal(statusBarStyleFor("#0B1220"), "light");
  assert.equal(statusBarStyleFor("#F8FAFC"), "dark");
});

test("parseArgs는 --tablet을 켜고 기본값은 false다", () => {
  assert.equal(parseArgs([]).tablet, false);
  assert.equal(parseArgs(["--tablet"]).tablet, true);
});

test("parseArgs는 값이 필요한 옵션을 읽는다", () => {
  const parsed = parseArgs(["--name", "Sample App", "--bundle-id", "com.a.b", "--templates-only"]);

  assert.equal(parsed.name, "Sample App");
  assert.equal(parsed.bundleId, "com.a.b");
  assert.equal(parsed.templatesOnly, true);
});

test("parseArgs는 모르는 인자를 throw한다", () => {
  assert.throws(() => parseArgs(["--unknown"]), /--unknown/);
});

test("resolveOptions는 정상 입력에서 파생값을 채운다", () => {
  const options = resolveOptions(validArgs, { cwd: CWD, exists: notExists });

  assert.equal(options.slug, "sample-app");
  assert.equal(options.scheme, "sample-app");
  assert.equal(options.tablet, false);
  assert.equal(options.statusBarStyle, "light");
  assert.equal(options.parentDirectory, CWD);
  assert.equal(options.projectDirectory, join(CWD, "sample-app"));
});

test("resolveOptions는 한글 이름에 slug가 없으면 --slug를 요구한다", () => {
  assert.throws(() => resolveOptions({ ...validArgs, name: "샘플앱" }, { cwd: CWD, exists: notExists }), /--slug/);
  assert.equal(
    resolveOptions({ ...validArgs, name: "샘플앱", slug: "sampleapp" }, { cwd: CWD, exists: notExists }).slug,
    "sampleapp",
  );
});

test("resolveOptions는 대상 디렉터리가 이미 있으면 멈춘다", () => {
  assert.throws(() => resolveOptions(validArgs, { cwd: CWD, exists: () => true }), /이미 존재/);
});

test("resolveOptions는 --templates-only일 때 대상 디렉터리가 있어야 한다", () => {
  const templatesOnly = { ...validArgs, templatesOnly: true };

  assert.throws(() => resolveOptions(templatesOnly, { cwd: CWD, exists: notExists }), /없습니다/);
  assert.equal(resolveOptions(templatesOnly, { cwd: CWD, exists: () => true }).templatesOnly, true);
});

test("resolveOptions는 #RRGGBB가 아닌 배경색을 막는다", () => {
  for (const background of ["#fff", "0B1220", "#GGGGGG"]) {
    assert.throws(() => resolveOptions({ ...validArgs, background }, { cwd: CWD, exists: notExists }), /#RRGGBB/, background);
  }
});

test("resolveOptions는 운영 URL을 릴리즈 검사와 같은 기준으로 막는다", () => {
  assert.throws(
    () => resolveOptions({ ...validArgs, prodUrl: "http://example.com" }, { cwd: CWD, exists: notExists }),
    /https/,
  );
  assert.throws(
    () => resolveOptions({ ...validArgs, prodUrl: "https://192.168.0.10" }, { cwd: CWD, exists: notExists }),
    /IP/,
  );
});

test("resolveOptions는 http(s)가 아닌 개발 URL을 막는다", () => {
  assert.throws(() => resolveOptions({ ...validArgs, devUrl: "ftp://x" }, { cwd: CWD, exists: notExists }), /개발 웹 URL/);
});

test("resolveOptions는 빠진 필수 입력을 모두 알려 준다", () => {
  assert.throws(
    () => resolveOptions(parseArgs([]), { cwd: CWD, exists: notExists }),
    (error) => ["--name", "--bundle-id", "--dev-url", "--prod-url", "--background"].every((flag) => error.message.includes(flag)),
  );
});

test("resolveOptions는 잘못된 번들 ID를 막는다", () => {
  assert.throws(() => resolveOptions({ ...validArgs, bundleId: "sample" }, { cwd: CWD, exists: notExists }), /번들 ID/);
});

// create-expo-app blank-typescript@sdk-58 초기 출력
const GENERATED_APP_JSON = {
  expo: {
    name: "sample-app",
    slug: "sample-app",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: { favicon: "./assets/favicon.png" },
  },
};
const GENERATED_PACKAGE_JSON = {
  name: "sample-app",
  version: "1.0.0",
  main: "index.ts",
  dependencies: { expo: "~58.0.17", "expo-status-bar": "~58.0.4", react: "19.3.0", "react-native": "0.88.0" },
  devDependencies: { "@types/react": "~19.3.0", typescript: "~6.0.3" },
  scripts: {
    start: "expo start",
    android: "expo start --android",
    ios: "expo start --ios",
    web: "expo start --web",
  },
  private: true,
};
const GENERATED_GITIGNORE = "node_modules/\n\n# local env files\n.env*.local\n\n# generated native folders\n/ios\n/android\n";
const GENERATED_PNPM_WORKSPACE = "minimumReleaseAgeExclude:\n  - '@expo/cli@58.1.14'\n  - expo@58.0.17\n";
const resolved = resolveOptions(validArgs, { cwd: CWD, exists: notExists });

test("applyAppJson은 입력값과 회사 고정값을 채우고 web 설정을 뺀다", () => {
  const { expo } = applyAppJson(GENERATED_APP_JSON, resolved);

  assert.equal(expo.name, "Sample App");
  assert.equal(expo.slug, "sample-app");
  assert.equal(expo.scheme, "sample-app");
  assert.equal(expo.owner, "illunex");
  assert.equal(expo.userInterfaceStyle, "automatic");
  assert.equal(expo.ios.bundleIdentifier, "com.illunex.sample");
  assert.equal(expo.android.package, "com.illunex.sample");
  assert.equal(expo.ios.supportsTablet, false);
  assert.equal(expo.web, undefined);
  assert.equal(expo.android.adaptiveIcon.backgroundColor, "#E6F4FE");
});

test("applyAppJson은 iPad 지원 입력을 그대로 반영한다", () => {
  assert.equal(applyAppJson(GENERATED_APP_JSON, { ...resolved, tablet: true }).expo.ios.supportsTablet, true);
});

test("applyAppJson은 스플래시 플러그인을 배경색으로 정확히 1개 넣는다", () => {
  const once = applyAppJson(GENERATED_APP_JSON, resolved);
  const twice = applyAppJson(once, resolved);
  const splash = twice.expo.plugins.filter((plugin) => Array.isArray(plugin) && plugin[0] === "expo-splash-screen");

  assert.deepEqual(splash, [
    [
      "expo-splash-screen",
      {
        image: "./assets/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#0B1220",
        dark: { backgroundColor: "#0B1220" },
      },
    ],
  ]);
  assert.deepEqual(twice, once);
  assert.equal(GENERATED_APP_JSON.expo.plugins, undefined);
});

test("applyPackageJson은 pnpm 기준 스크립트와 jest 설정을 넣는다", () => {
  const pkg = applyPackageJson(GENERATED_PACKAGE_JSON);

  assert.deepEqual(pkg.scripts, {
    start: "expo start",
    android: "expo run:android",
    ios: "expo run:ios",
    lint: "expo lint",
    typecheck: "tsc --noEmit",
    test: "jest",
    "test:scripts": 'node --test "scripts/__tests__/*.test.js"',
    "set-version": "node scripts/set-version.js",
    release: "node scripts/release.js",
    "check-release": "node scripts/check-release.js",
  });
  assert.deepEqual(pkg.jest, {
    preset: "jest-expo",
    moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
    // scripts/__tests__는 node:test로 돌리는 릴리즈 스크립트 테스트라 jest 대상에서 뺀다.
    testPathIgnorePatterns: ["/node_modules/", "<rootDir>/scripts/"],
  });
  assert.deepEqual(pkg.dependencies, GENERATED_PACKAGE_JSON.dependencies);
  assert.deepEqual(applyPackageJson(pkg), pkg);
});

test("applyTsconfig는 @/* 별칭을 src로 연결하고 strict를 유지한다", () => {
  const tsconfig = applyTsconfig({ extends: "expo/tsconfig.base", compilerOptions: { strict: true } });

  assert.deepEqual(tsconfig.compilerOptions.paths, { "@/*": ["./src/*"] });
  // TypeScript 6부터 types 기본값이 []라 jest 전역(describe·expect)을 명시해야 typecheck가 통과한다.
  assert.deepEqual(tsconfig.compilerOptions.types, ["jest"]);
  assert.equal(tsconfig.compilerOptions.strict, true);
  assert.equal(tsconfig.extends, "expo/tsconfig.base");
});

test("applyGitignore는 .env 전체를 막고 .env.example만 허용한다", () => {
  const once = applyGitignore(GENERATED_GITIGNORE);
  const lines = once.split("\n");

  assert.ok(lines.includes(".env*"));
  assert.ok(lines.includes("!.env.example"));
  assert.ok(lines.includes("/ios"));
  assert.ok(lines.includes("/android"));
  assert.equal(applyGitignore(once), once);
});

const BUILD_SCRIPT_PACKAGES = ["'@parcel/watcher'", "dtrace-provider", "protobufjs", "unrs-resolver"];

test("applyPnpmWorkspace는 의존성 빌드 스크립트를 모두 false로 명시하고 기존 설정을 유지한다", () => {
  const once = applyPnpmWorkspace(GENERATED_PNPM_WORKSPACE);

  assert.match(once, /^allowBuilds:$/m);
  for (const name of BUILD_SCRIPT_PACKAGES) {
    assert.match(once, new RegExp(`^ {2}${name}: false$`, "m"), name);
  }
  assert.ok(once.includes("minimumReleaseAgeExclude:\n  - '@expo/cli@58.1.14'\n  - expo@58.0.17\n"));
  assert.equal(applyPnpmWorkspace(once), once);
});

test("applyPnpmWorkspace는 이미 있는 allowBuilds 블록에 빠진 항목만 더하고 기존 값은 유지한다", () => {
  const result = applyPnpmWorkspace("allowBuilds:\n  unrs-resolver: true\nminimumReleaseAgeExclude:\n  - expo@58.0.17\n");

  assert.equal(result.match(/^allowBuilds:$/gm).length, 1);
  assert.match(result, /^ {2}unrs-resolver: true$/m);
  assert.doesNotMatch(result, /unrs-resolver: false/);
  assert.match(result, /^ {2}protobufjs: false$/m);
  assert.ok(result.endsWith("minimumReleaseAgeExclude:\n  - expo@58.0.17\n"));
});

test("renderTokens는 지정한 토큰만 바꾸고 __DEV__ 같은 값은 건드리지 않는다", () => {
  const rendered = renderTokens("a __CCM_APP_NAME__ b __DEV__ window.__NATIVE_APP__ __CCM_APP_NAME__", {
    __CCM_APP_NAME__: "Sample App",
  });

  assert.equal(rendered, "a Sample App b __DEV__ window.__NATIVE_APP__ Sample App");
});

test("buildTokens는 템플릿 토큰 3개를 만든다", () => {
  assert.deepEqual(buildTokens(resolved), {
    __CCM_APP_NAME__: "Sample App",
    __CCM_BACKGROUND_COLOR__: "#0B1220",
    __CCM_STATUS_BAR_STYLE__: "light",
  });
});

test("buildEnvFiles는 개발·운영 웹 URL을 각 env 파일에 쓴다", () => {
  assert.deepEqual(buildEnvFiles(resolved), {
    ".env.development": "EXPO_PUBLIC_WEBVIEW_URL=http://192.168.0.10:3000\n",
    ".env.production": "EXPO_PUBLIC_WEBVIEW_URL=https://example.com\n",
  });
});

test("sdkNotice는 템플릿 기준보다 새 SDK major가 있을 때만 알린다", () => {
  const notice = sdkNotice("59.0.1", 58);

  assert.ok(notice.includes("59"));
  assert.ok(notice.includes("58"));
  assert.equal(sdkNotice("58.0.17", 58), null);
  assert.equal(sdkNotice("57.0.0", 58), null);
  assert.equal(sdkNotice("not-a-version", 58), null);
});

test("buildChecklist는 설계 문서 4.8 순서대로 8개를 안내한다", () => {
  const checklist = buildChecklist({ tablet: false });

  assert.equal(checklist.length, 8);
  assert.match(checklist[0], /remote/);
  assert.match(checklist[1], /illunex/);
  assert.match(checklist[2], /ascAppId/);
  assert.match(checklist[3], /Play Console/);
  assert.match(checklist[4], /EXPO_PUBLIC_WEBVIEW_URL/);
  assert.match(checklist[5], /build:version:set/);
  assert.match(checklist[6], /--build-only/);
  assert.match(checklist[7], /스플래시/);
});

test("buildChecklist는 iPad 지원을 켜면 iPad 항목을 마지막에 더한다", () => {
  const checklist = buildChecklist({ tablet: true });

  assert.equal(checklist.length, 9);
  assert.match(checklist[8], /iPad/);
});

test("RUNTIME_DEPENDENCIES는 Android에서 userInterfaceStyle을 적용하는 expo-system-ui를 포함한다", () => {
  // prebuild 경고: "userInterfaceStyle: Install expo-system-ui in your project to enable this feature."
  assert.ok(RUNTIME_DEPENDENCIES.includes("expo-system-ui"));
});
