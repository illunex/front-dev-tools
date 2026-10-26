#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
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
    jest: {
      preset: "jest-expo",
      moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
      // scripts/__tests__는 node:test로 돌리는 릴리즈 스크립트 테스트라 jest 대상에서 뺀다.
      testPathIgnorePatterns: ["/node_modules/", "<rootDir>/scripts/"],
    },
  };
}

export function applyTsconfig(tsconfig) {
  return {
    ...tsconfig,
    // TypeScript 6부터 types 기본값이 []라 jest 전역(describe·expect)을 명시한다.
    compilerOptions: { ...tsconfig.compilerOptions, strict: true, types: ["jest"], paths: { "@/*": ["./src/*"] } },
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

// pnpm 11은 승인되지 않은 의존성 빌드 스크립트를 오류로 멈춘다. 회사 표준 의존성이 끌어오는 패키지를 미리 정한다.
// 모두 미리 빌드된 바이너리를 쓰거나(@parcel/watcher, unrs-resolver) 선택적 네이티브 빌드·안내 출력뿐이라 실행하지 않는다.
const DISALLOWED_BUILDS = ["'@parcel/watcher'", "dtrace-provider", "protobufjs", "unrs-resolver"];

export function applyPnpmWorkspace(text) {
  const blockMatch = /^allowBuilds:\n((?: {2}.*\n?)*)/m.exec(text);
  const existing = blockMatch ? blockMatch[1] : "";
  const missing = DISALLOWED_BUILDS.filter(
    (name) => !new RegExp(`^ {2}["']?${name.replace(/'/g, "")}["']?:`, "m").test(existing),
  );
  if (missing.length === 0) return text;

  const additions = missing.map((name) => `  ${name}: false\n`).join("");
  if (!blockMatch) return `allowBuilds:\n${additions}${text}`;

  const blockEnd = blockMatch.index + blockMatch[0].length;
  const block = blockMatch[0].endsWith("\n") ? blockMatch[0] : `${blockMatch[0]}\n`;
  return `${text.slice(0, blockMatch.index)}${block}${additions}${text.slice(blockEnd)}`;
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

// 템플릿 코어를 검증한 Expo SDK major. 올리는 절차는 docs/create-company-mobile.md "SDK 갱신 절차".
export const VERIFIED_EXPO_SDK = 58;

export const RUNTIME_DEPENDENCIES = [
  "react-native-webview",
  "react-native-safe-area-context",
  "expo-web-browser",
  "expo-splash-screen",
  "expo-constants",
  "expo-dev-client",
  // app.json userInterfaceStyle(automatic)을 Android에 적용하는 데 필요하다.
  "expo-system-ui",
];

// SDK 버전에 맞춰야 하는 개발 의존성은 expo install로, 그 외는 버전을 고정해 pnpm add로 넣는다.
export const DEV_DEPENDENCIES = ["jest-expo", "jest", "@types/jest", "eslint-config-expo"];

// eslint-plugin-react가 ESLint 10을 아직 지원하지 않아 expo lint 기본 설정과 같은 ^9로 고정한다.
export const PINNED_DEV_DEPENDENCIES = ["eslint@^9", "eas-cli"];

export function sdkNotice(latestExpoVersion, verified) {
  const major = Number.parseInt(latestExpoVersion, 10);
  if (!Number.isInteger(major) || major <= verified) return null;
  return `참고: Expo SDK ${major}가 나와 있지만 이 템플릿은 SDK ${verified} 기준으로 검증되어 SDK ${verified}로 생성합니다.`;
}

export function buildChecklist({ tablet }) {
  const items = [
    "git remote를 연결하고 첫 커밋을 push하세요. 릴리즈 가드가 origin/main을 확인합니다.",
    "Expo illunex 조직 멤버 권한을 확인한 뒤 `pnpm exec eas login` → `pnpm exec eas init`으로 projectId를 만드세요.",
    "App Store Connect에 앱을 만들고 eas.json submit.production.ios.ascAppId를 채운 뒤, API Key를 `pnpm exec eas credentials -p ios`로 등록하세요.",
    "Play Console에 앱을 만들고 서비스 계정 키를 `pnpm exec eas credentials -p android`로 등록하세요.",
    "EAS 환경 변수 EXPO_PUBLIC_WEBVIEW_URL을 development(개발 URL)·preview·production(운영 URL)에 등록하세요(`pnpm exec eas env:create`).",
    "원격 빌드 번호를 초기화하세요(`pnpm exec eas build:version:set -p ios|android`). 새 앱은 첫 빌드가 1이 되게 넣습니다.",
    "첫 Android 릴리즈만 `pnpm release android --build-only`로 빌드하고, EAS에서 받은 AAB를 Play Console 내부 테스트에 직접 업로드하세요. 이후부터는 `pnpm release`를 씁니다.",
    "assets의 스플래시·아이콘 이미지를 브랜드 이미지로 교체하세요(생성기 기본 이미지가 들어 있습니다).",
  ];
  if (tablet) {
    items.push("iPad 지원을 켰습니다. App Store Connect에 iPad 스크린샷을 준비하고 웹 화면을 iPad 폭에서 확인하세요.");
  }
  return items;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function updateTextFile(path, transform) {
  const current = existsSync(path) ? readFileSync(path, "utf8") : "";
  writeFileSync(path, transform(current));
}

const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".json", ".md", ".yml", ".example"]);

// 템플릿 폴더를 프로젝트에 덮어쓰고, 텍스트 파일에만 토큰을 치환한다.
function copyTemplates(projectDirectory, tokens) {
  cpSync(TEMPLATE_DIR, projectDirectory, { recursive: true, force: true });

  const visit = (relativeDirectory) => {
    for (const entry of readdirSync(join(TEMPLATE_DIR, relativeDirectory), { withFileTypes: true })) {
      const relativePath = join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(relativePath);
      } else if (TEXT_EXTENSIONS.has(extname(entry.name))) {
        updateTextFile(join(projectDirectory, relativePath), (content) => renderTokens(content, tokens));
      }
    }
  };
  visit("");
}

function applyProjectFiles(options) {
  const root = options.projectDirectory;

  writeJson(join(root, "app.json"), applyAppJson(readJson(join(root, "app.json")), options));
  writeJson(join(root, "package.json"), applyPackageJson(readJson(join(root, "package.json"))));
  writeJson(join(root, "tsconfig.json"), applyTsconfig(readJson(join(root, "tsconfig.json"))));
  updateTextFile(join(root, ".gitignore"), applyGitignore);
  updateTextFile(join(root, "pnpm-workspace.yaml"), applyPnpmWorkspace);

  // 진입점은 src/app으로 옮기고, 웹 타깃은 쓰지 않는다.
  rmSync(join(root, "App.tsx"), { force: true });
  rmSync(join(root, "assets/favicon.png"), { force: true });

  copyTemplates(root, buildTokens(options));
  for (const [file, content] of Object.entries(buildEnvFiles(options))) {
    writeFileSync(join(root, file), content);
  }
}

function run(command, commandArgs, cwd, hint) {
  const result = spawnSync(command, commandArgs, { cwd, stdio: "inherit", shell: false });
  if (result.status !== 0) {
    throw new Error(`명령 실패: ${command} ${commandArgs.join(" ")}${hint ? `\n${hint}` : ""}`);
  }
}

function ensureCommand(command) {
  const result = spawnSync(command, ["--version"], { stdio: "ignore", shell: false });
  if (result.status !== 0) {
    throw new Error(`필요한 명령이 없습니다: ${command} (pnpm은 corepack enable 또는 pnpm 설치로 준비하세요)`);
  }
}

function readLatestExpoVersion() {
  const result = spawnSync("pnpm", ["view", "expo", "version"], { encoding: "utf8", shell: false });
  return result.status === 0 ? result.stdout.trim() : "";
}

const INSTALL_HINT = [
  "설치가 실패했습니다. pnpm 11에서 흔한 원인은 두 가지입니다.",
  "- ERR_PNPM_IGNORED_BUILDS: 새 의존성의 빌드 스크립트 승인 여부가 없습니다. pnpm-workspace.yaml allowBuilds에 true/false를 정하고, 템플릿 CLI의 DISALLOWED_BUILDS도 갱신하세요.",
  "- minimumReleaseAge: 막 나온 패키지 설치가 거절됐습니다. 출력된 패키지를 pnpm-workspace.yaml minimumReleaseAgeExclude에 넣거나 잠시 후 다시 시도하세요.",
].join("\n");

function createProject(options) {
  const notice = sdkNotice(readLatestExpoVersion(), VERIFIED_EXPO_SDK);
  if (notice) console.log(notice);

  if (!options.templatesOnly) {
    mkdirSync(options.parentDirectory, { recursive: true });
    run(
      "pnpm",
      ["create", "expo-app", options.slug, "--template", `blank-typescript@sdk-${VERIFIED_EXPO_SDK}`, "--no-install"],
      options.parentDirectory,
    );
  }

  applyProjectFiles(options);

  const root = options.projectDirectory;
  if (!options.templatesOnly && !options.skipInstall) {
    run("pnpm", ["install"], root, INSTALL_HINT);
    run("pnpm", ["expo", "install", ...RUNTIME_DEPENDENCIES], root, INSTALL_HINT);
    run("pnpm", ["expo", "install", ...DEV_DEPENDENCIES, "--", "-D"], root, INSTALL_HINT);
    run("pnpm", ["add", "-D", ...PINNED_DEV_DEPENDENCIES], root, INSTALL_HINT);
  }

  if (!options.templatesOnly && !options.skipVerify) {
    run("pnpm", ["typecheck"], root);
    run("pnpm", ["lint"], root);
    run("pnpm", ["test", "--passWithNoTests"], root);
    run("pnpm", ["test:scripts"], root);
  }

  console.log(`\n${options.templatesOnly ? "템플릿을 다시 적용했습니다" : "모바일 웹뷰 프로젝트를 만들었습니다"}: ${root}`);
  if (!options.templatesOnly) {
    console.log("\n팀원이 직접 해야 할 일:");
    buildChecklist(options).forEach((item, index) => console.log(`${index + 1}. ${item}`));
  }
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
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      printHelp();
      return;
    }
    ensureCommand("pnpm");
    createProject(resolveOptions(parsed, { cwd: process.cwd(), exists: existsSync }));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main(process.argv.slice(2));
}
