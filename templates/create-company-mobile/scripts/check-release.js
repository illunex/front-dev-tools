#!/usr/bin/env node

/**
 * 스토어 빌드 전에 정적 검사를 한다. EAS 워크플로 verify 잡과 로컬 release 가드가 같이 쓴다.
 * - 빌드가 실제로 쓰는 운영 웹 URL(EAS production 환경 변수)이 https 도메인인가
 * - 스토어 제출을 할 때 eas.json submit 설정이 채워져 있는가
 *
 * 사용법(워크플로): node scripts/check-release.js --platform <all|ios|android> --submit <true|false>
 */

const fs = require("fs");
const path = require("path");

const PLATFORMS = ["all", "ios", "android"];
const WEBVIEW_URL_KEY = "EXPO_PUBLIC_WEBVIEW_URL";

// RN/Hermes와 같은 방식으로 맞추기 위해 URL 객체 대신 정규식으로 호스트를 뽑는다.
function extractHost(url) {
  const match = /^[a-z][a-z0-9+.-]*:\/\/([^/?#:]+)/i.exec(url);
  return match ? match[1].toLowerCase() : "";
}

function isIpOrLocalhost(host) {
  return host === "localhost" || /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function findWebUrlProblems(url) {
  if (!url) {
    return [
      `운영 웹 URL(${WEBVIEW_URL_KEY})이 EAS production 환경 변수에 없습니다. ` +
        "README/AGENTS.md 체크리스트 5번대로 EAS 환경 변수를 등록하세요.",
    ];
  }
  if (!/^https:\/\//i.test(url)) {
    return [`운영 웹 URL이 https가 아닙니다: ${url}`];
  }
  if (isIpOrLocalhost(extractHost(url))) {
    return [`운영 웹 URL이 IP 또는 localhost입니다(테스트 서버 주소로 보임): ${url}`];
  }
  return [];
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function findSubmitProblems(easJson, platform) {
  if (!isObject(easJson)) {
    return ["eas.json을 읽지 못했습니다."];
  }

  const production = isObject(easJson.submit) && isObject(easJson.submit.production) ? easJson.submit.production : {};
  const ios = isObject(production.ios) ? production.ios : {};
  const android = isObject(production.android) ? production.android : {};
  const problems = [];

  if ((platform === "all" || platform === "ios") && !ios.ascAppId) {
    problems.push(
      "eas.json submit.production.ios.ascAppId가 비어 있습니다. App Store Connect 앱 ID를 넣으세요(체크리스트 3번).",
    );
  }
  if ((platform === "all" || platform === "android") && !android.track) {
    problems.push("eas.json submit.production.android.track이 비어 있습니다.");
  }
  return problems;
}

function findReleaseProblems({ webViewUrl, easJson, platform, submit }) {
  return [...findWebUrlProblems(webViewUrl), ...(submit ? findSubmitProblems(easJson, platform) : [])];
}

function parseCheckArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    values[argv[index]] = argv[index + 1];
  }

  const platform = values["--platform"];
  const submit = values["--submit"];
  if (!PLATFORMS.includes(platform)) {
    throw new Error(`--platform 값이 올바르지 않습니다: ${platform}`);
  }
  if (submit !== "true" && submit !== "false") {
    throw new Error(`--submit 값은 true 또는 false여야 합니다: ${submit}`);
  }
  return { platform, submit: submit === "true" };
}

function readEasJson(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, "eas.json"), "utf8"));
  } catch {
    return null;
  }
}

module.exports = { WEBVIEW_URL_KEY, findWebUrlProblems, findSubmitProblems, findReleaseProblems, parseCheckArgs, readEasJson };

if (require.main === module) {
  let args;
  try {
    args = parseCheckArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error("사용법: node scripts/check-release.js --platform <all|ios|android> --submit <true|false>");
    process.exit(1);
  }

  const problems = findReleaseProblems({
    webViewUrl: process.env[WEBVIEW_URL_KEY],
    easJson: readEasJson(path.resolve(__dirname, "..")),
    ...args,
  });

  if (problems.length > 0) {
    problems.forEach((problem) => console.error(`✖ ${problem}`));
    process.exit(1);
  }
  console.log("배포 전 검사 통과");
}
