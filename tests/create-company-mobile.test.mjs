import { test } from "node:test";
import assert from "node:assert/strict";
import { join } from "node:path";

import {
  parseArgs,
  deriveSlug,
  isValidBundleId,
  statusBarStyleFor,
  resolveOptions,
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
