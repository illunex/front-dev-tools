#!/usr/bin/env node
import { existsSync, realpathSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = resolve(SCRIPT_DIR, "../templates/create-company-mobile");

// 운영 URL 판정 기준을 생성 시점과 릴리즈 시점이 똑같이 쓰도록 템플릿의 검사 함수를 그대로 가져온다.
const { findWebUrlProblems } = createRequire(import.meta.url)(join(TEMPLATE_DIR, "scripts/check-release.js"));

const VALUE_FLAGS = {
  "--name": "name",
  "--slug": "slug",
  "--bundle-id": "bundleId",
  "--dev-url": "devUrl",
  "--prod-url": "prodUrl",
  "--background": "background",
  "--directory": "directory",
};

const BOOLEAN_FLAGS = {
  "--tablet": "tablet",
  "--skip-install": "skipInstall",
  "--skip-verify": "skipVerify",
  "--templates-only": "templatesOnly",
  "--help": "help",
  "-h": "help",
};

export function parseArgs(argv) {
  const parsed = { tablet: false, skipInstall: false, skipVerify: false, templatesOnly: false, help: false };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg in VALUE_FLAGS) {
      parsed[VALUE_FLAGS[arg]] = argv[++index];
    } else if (arg in BOOLEAN_FLAGS) {
      parsed[BOOLEAN_FLAGS[arg]] = true;
    } else {
      throw new Error(`알 수 없는 인자입니다: ${arg}`);
    }
  }

  return parsed;
}

export function deriveSlug(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// iOS는 하이픈을 허용하지만 같은 값을 Android package에도 쓰므로 Android 규칙에 맞춘다.
export function isValidBundleId(id) {
  return /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/.test(id);
}

function isHexColor(value) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

// sRGB 상대 휘도로 배경이 밝으면 어두운 글자(dark), 어두우면 밝은 글자(light)를 고른다.
export function statusBarStyleFor(hex) {
  const [r, g, b] = [1, 3, 5].map((start) => {
    const channel = parseInt(hex.slice(start, start + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.5 ? "dark" : "light";
}

export function resolveOptions(parsed, { cwd, exists }) {
  const missing = [
    ["name", "--name"],
    ["bundleId", "--bundle-id"],
    ["devUrl", "--dev-url"],
    ["prodUrl", "--prod-url"],
    ["background", "--background"],
  ]
    .filter(([key]) => !parsed[key])
    .map(([, flag]) => flag);
  if (missing.length > 0) {
    throw new Error(`필수 입력이 없습니다: ${missing.join(", ")}`);
  }

  const slug = parsed.slug ?? deriveSlug(parsed.name);
  if (!slug || deriveSlug(slug) !== slug) {
    throw new Error("앱 이름으로 디렉터리명을 만들 수 없습니다. --slug로 영문 소문자·숫자·하이픈 이름을 지정하세요.");
  }
  if (!isValidBundleId(parsed.bundleId)) {
    throw new Error(`번들 ID 형식이 올바르지 않습니다: ${parsed.bundleId} (예: com.illunex.sample)`);
  }
  if (!/^https?:\/\/[^/?#]+/i.test(parsed.devUrl)) {
    throw new Error(`개발 웹 URL은 http:// 또는 https://로 시작해야 합니다: ${parsed.devUrl}`);
  }
  const prodUrlProblems = findWebUrlProblems(parsed.prodUrl);
  if (prodUrlProblems.length > 0) {
    throw new Error(prodUrlProblems.join("\n"));
  }
  if (!isHexColor(parsed.background)) {
    throw new Error(`배경색은 #RRGGBB 형식이어야 합니다: ${parsed.background}`);
  }

  const parentDirectory = resolve(cwd, parsed.directory ?? ".");
  const projectDirectory = join(parentDirectory, slug);
  if (!parsed.templatesOnly && exists(projectDirectory)) {
    throw new Error(`대상 디렉터리가 이미 존재합니다: ${projectDirectory}`);
  }
  if (parsed.templatesOnly && !exists(projectDirectory)) {
    throw new Error(`--templates-only 대상 디렉터리가 없습니다: ${projectDirectory}`);
  }

  return {
    name: parsed.name,
    slug,
    scheme: slug,
    bundleId: parsed.bundleId,
    devUrl: parsed.devUrl,
    prodUrl: parsed.prodUrl,
    background: parsed.background.toUpperCase(),
    statusBarStyle: statusBarStyleFor(parsed.background),
    tablet: parsed.tablet,
    parentDirectory,
    projectDirectory,
    skipInstall: parsed.skipInstall,
    skipVerify: parsed.skipVerify,
    templatesOnly: parsed.templatesOnly,
  };
}

const EXPO_OWNER = "illunex";
const SPLASH_PLUGIN = "expo-splash-screen";

// 아래 apply* 함수는 입력을 바꾸지 않고, 두 번 적용해도 결과가 같다(--templates-only 재적용 대비).
export function applyAppJson(appJson, options) {
  const expo = structuredClone(appJson.expo ?? {});
  delete expo.web;

  const plugins = (expo.plugins ?? []).filter(
    (plugin) => plugin !== SPLASH_PLUGIN && !(Array.isArray(plugin) && plugin[0] === SPLASH_PLUGIN),
  );
  plugins.push([
    SPLASH_PLUGIN,
    {
      image: "./assets/splash-icon.png",
      imageWidth: 200,
      resizeMode: "contain",
      backgroundColor: options.background,
      dark: { backgroundColor: options.background },
    },
  ]);

  return {
    ...appJson,
    expo: {
      ...expo,
      name: options.name,
      slug: options.slug,
      scheme: options.scheme,
      owner: EXPO_OWNER,
      orientation: "portrait",
      userInterfaceStyle: "automatic",
      ios: { ...expo.ios, bundleIdentifier: options.bundleId, supportsTablet: options.tablet },
      android: { ...expo.android, package: options.bundleId },
      plugins,
    },
  };
}

const PACKAGE_SCRIPTS = {
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
};

export function applyPackageJson(pkg) {
  return {
    ...pkg,
    scripts: { ...PACKAGE_SCRIPTS },
    jest: { preset: "jest-expo", moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" } },
  };
}

export function applyTsconfig(tsconfig) {
  return {
    ...tsconfig,
    compilerOptions: { ...tsconfig.compilerOptions, strict: true, paths: { "@/*": ["./src/*"] } },
  };
}

const GITIGNORE_ENV_LINES = [".env*", "!.env.example"];

export function applyGitignore(text) {
  const lines = text.split("\n");
  const missing = GITIGNORE_ENV_LINES.filter((line) => !lines.includes(line));
  if (missing.length === 0) return text;

  const base = text.endsWith("\n") ? text : `${text}\n`;
  return `${base}\n# env 파일은 커밋하지 않는다. 키 목록은 .env.example, 클라우드 빌드 값은 EAS 환경 변수\n${missing.join("\n")}\n`;
}

// eslint-config-expo가 끌어오는 unrs-resolver의 빌드 스크립트 승인 여부를 미리 정해 pnpm 11 설치가 멈추지 않게 한다.
export function applyPnpmWorkspace(text) {
  if (/^allowBuilds:/m.test(text)) return text;
  return `allowBuilds:\n  unrs-resolver: false\n${text}`;
}

export function renderTokens(content, tokens) {
  return Object.entries(tokens).reduce((result, [token, value]) => result.replaceAll(token, value), content);
}

export function buildTokens(options) {
  return {
    __CCM_APP_NAME__: options.name,
    __CCM_BACKGROUND_COLOR__: options.background,
    __CCM_STATUS_BAR_STYLE__: options.statusBarStyle,
  };
}

export function buildEnvFiles(options) {
  return {
    ".env.development": `EXPO_PUBLIC_WEBVIEW_URL=${options.devUrl}\n`,
    ".env.production": `EXPO_PUBLIC_WEBVIEW_URL=${options.prodUrl}\n`,
  };
}

function printHelp() {
  console.log(`Usage:
  create-company-mobile --name <앱 이름> --bundle-id <번들 ID> --dev-url <개발 웹 URL> --prod-url <운영 웹 URL> --background <#RRGGBB> [options]

Options:
  --slug <slug>        디렉터리명·slug·scheme (기본: 앱 이름에서 생성. 한글 이름이면 필수)
  --tablet             iPad 지원(ios.supportsTablet). 켜면 App Store 심사에 iPad 스크린샷 필요
  --directory <path>   프로젝트를 만들 부모 디렉터리 (기본: 현재 디렉터리)
  --skip-install       의존성 추가 설치를 건너뜀
  --skip-verify        typecheck·lint·test 검증을 건너뜀
  --templates-only     이미 생성된 프로젝트에 템플릿만 다시 적용 (템플릿 유지보수용)
  -h, --help           도움말
`);
}

function main(argv) {
  let options;
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      printHelp();
      return;
    }
    options = resolveOptions(parsed, { cwd: process.cwd(), exists: existsSync });
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  return options;
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2));
}
