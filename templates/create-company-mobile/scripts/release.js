#!/usr/bin/env node

/**
 * 로컬 가드를 통과한 경우에만 EAS 릴리즈 워크플로를 실행한다.
 * eas workflow:run은 로컬 폴더 전체(미커밋·미추적 파일 포함)를 업로드하므로,
 * push된 main 커밋과 똑같은 상태일 때만 업로드되게 막는다.
 *
 * 사용법: pnpm release [all|ios|android] [--build-only]   (플랫폼 생략 시 all)
 * --build-only: 스토어 제출 없이 빌드만 한다. 새 앱의 첫 Android AAB처럼 콘솔에 직접 올려야 할 때 쓴다.
 */

const { execFileSync, spawnSync } = require("child_process");
const path = require("path");

const { WEBVIEW_URL_KEY, findReleaseProblems, readEasJson } = require("./check-release");

const PLATFORMS = ["all", "ios", "android"];
const WORKFLOW_FILE = ".eas/workflows/release.yml";
const USAGE = "사용법: pnpm release [all|ios|android] [--build-only]";

function parseReleaseArgs(args) {
  const buildOnly = args.includes("--build-only");
  const rest = args.filter((arg) => arg !== "--build-only");

  if (rest.length === 0) return { platform: "all", buildOnly };
  if (rest.length === 1 && PLATFORMS.includes(rest[0])) return { platform: rest[0], buildOnly };
  throw new Error(`인자가 올바르지 않습니다: ${args.join(" ")}`);
}

function findGitProblems({ branch, porcelain, head, remoteHead }) {
  const problems = [];

  if (branch !== "main") {
    problems.push(`main 브랜치에서만 릴리즈할 수 있습니다. 현재 브랜치: ${branch}`);
  }
  if (porcelain.trim() !== "") {
    const files = porcelain
      .trimEnd()
      .split("\n")
      .map((line) => `    ${line}`)
      .join("\n");
    problems.push(`커밋하지 않은 변경이나 추적하지 않는 파일이 있습니다. 업로드에 그대로 포함됩니다.\n${files}`);
  }
  if (head !== remoteHead) {
    problems.push("origin/main과 커밋이 다릅니다. push 또는 pull을 확인하세요.");
  }

  return problems;
}

// 원격 빌드 번호가 없으면 EAS가 로컬 값으로 초기화해 스토어 업로드가 번호 중복으로 거절될 수 있다.
function findRemoteVersionProblems(platform, remote) {
  const required = [
    { platform: "android", key: "versionCode", source: "Play Console" },
    { platform: "ios", key: "buildNumber", source: "App Store Connect" },
  ];

  return required
    .filter((item) => (platform === "all" || platform === item.platform) && remote[item.key] === undefined)
    .map(
      (item) =>
        `원격 ${item.platform} ${item.key}가 초기화되지 않았습니다. ` +
        `pnpm exec eas build:version:set -p ${item.platform}로 ${item.source}의 최신 값(새 앱이면 첫 빌드가 1이 되는 값)을 먼저 넣으세요.`,
    );
}

// eas env:get은 `KEY=value` 형식으로 출력한다. 변수가 없으면 실패하므로 undefined로 본다.
function readEasEnvValue(root, environment, name) {
  try {
    const output = execFileSync(
      "pnpm",
      ["exec", "eas", "env:get", environment, "--variable-name", name, "--format", "short", "--non-interactive"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    const line = output.split("\n").find((item) => item.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim() : undefined;
  } catch {
    return undefined;
  }
}

function abort(problems) {
  console.error("릴리즈를 중단합니다.");
  problems.forEach((problem) => console.error(`✖ ${problem}`));
  process.exit(1);
}

module.exports = { parseReleaseArgs, findGitProblems, findRemoteVersionProblems };

if (require.main === module) {
  const root = path.resolve(__dirname, "..");
  const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();

  let args;
  try {
    args = parseReleaseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error(USAGE);
    process.exit(1);
  }
  const { platform, buildOnly } = args;

  let gitState;
  try {
    const branch = git("rev-parse", "--abbrev-ref", "HEAD");
    const porcelain = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" });
    execFileSync("git", ["fetch", "origin", "main"], { cwd: root, stdio: "pipe" });
    gitState = { branch, porcelain, head: git("rev-parse", "HEAD"), remoteHead: git("rev-parse", "origin/main") };
  } catch (error) {
    abort([`git 상태를 확인할 수 없습니다(remote origin과 main 브랜치가 필요합니다): ${String(error.stderr || error.message).trim()}`]);
  }

  const problems = [
    ...findGitProblems(gitState),
    ...findReleaseProblems({
      webViewUrl: readEasEnvValue(root, "production", WEBVIEW_URL_KEY),
      easJson: readEasJson(root),
      platform,
      submit: !buildOnly,
    }),
  ];
  if (problems.length > 0) abort(problems);

  let remote;
  try {
    const output = execFileSync(
      "pnpm",
      ["exec", "eas", "build:version:get", "-p", platform, "--json", "--non-interactive"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
    remote = JSON.parse(output);
  } catch (error) {
    abort([`원격 빌드 번호를 확인할 수 없습니다(eas build:version:get 실패): ${String(error.stderr || error.message).trim()}`]);
  }
  const remoteProblems = findRemoteVersionProblems(platform, remote);
  if (remoteProblems.length > 0) abort(remoteProblems);

  console.log(`가드 통과: ${gitState.head.slice(0, 7)} (main = origin/main), 플랫폼 ${platform}${buildOnly ? ", 빌드만" : ""}`);
  const result = spawnSync(
    "pnpm",
    ["exec", "eas", "workflow:run", WORKFLOW_FILE, "-F", `platform=${platform}`, "-F", `submit=${!buildOnly}`],
    { cwd: root, stdio: "inherit" },
  );
  process.exit(result.status ?? 1);
}
