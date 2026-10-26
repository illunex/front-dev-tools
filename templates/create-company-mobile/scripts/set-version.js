#!/usr/bin/env node

/**
 * 앱 마케팅 버전(x.y.z)을 app.json에 쓴다.
 * iOS·Android 모두 CNG라 네이티브 버전은 app.json에서 생성되므로 이 파일 하나만 고치면 된다.
 *
 * 사용법: pnpm set-version 1.2.3
 */

const fs = require("fs");
const path = require("path");

const APP_JSON = "app.json";

function isValidVersion(version) {
  return /^\d+\.\d+\.\d+$/.test(version);
}

function readAppVersion(appJsonText) {
  return JSON.parse(appJsonText).expo.version;
}

function writeVersion(root, version) {
  if (!isValidVersion(version)) {
    throw new Error(`버전 형식이 올바르지 않습니다: "${version}" (x.y.z 형식만 허용)`);
  }

  const appJsonPath = path.join(root, APP_JSON);
  const appJson = fs.readFileSync(appJsonPath, "utf8");

  // JSON.stringify로 다시 쓰면 인라인 배열 등 기존 포맷이 깨지므로 문자열을 정확히 1회 치환한다.
  const currentEntry = `"version": "${readAppVersion(appJson)}"`;
  const occurrences = appJson.split(currentEntry).length - 1;
  if (occurrences !== 1) {
    throw new Error(`${APP_JSON}에서 ${currentEntry}가 ${occurrences}번 나옵니다. 1번이어야 합니다.`);
  }

  fs.writeFileSync(appJsonPath, appJson.replace(currentEntry, `"version": "${version}"`));
}

module.exports = { isValidVersion, readAppVersion, writeVersion };

if (require.main === module) {
  const args = process.argv.slice(2);
  const version = args[0];

  if (args.length !== 1 || !isValidVersion(version)) {
    console.error("사용법: pnpm set-version <x.y.z>");
    console.error("예시:   pnpm set-version 1.2.3");
    process.exit(1);
  }

  const root = path.resolve(__dirname, "..");
  const before = readAppVersion(fs.readFileSync(path.join(root, APP_JSON), "utf8"));
  writeVersion(root, version);
  console.log(`버전 ${before} → ${version} (app.json)`);
}
