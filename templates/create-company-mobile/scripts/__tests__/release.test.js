const { test } = require("node:test");
const assert = require("node:assert/strict");

const { parseReleaseArgs, findGitProblems, findRemoteVersionProblems } = require("../release");

const cleanState = { branch: "main", porcelain: "", head: "abc", remoteHead: "abc" };

test("parseReleaseArgs는 인자가 없으면 all 플랫폼 일반 릴리즈다", () => {
  assert.deepEqual(parseReleaseArgs([]), { platform: "all", buildOnly: false });
});

test("parseReleaseArgs는 플랫폼과 --build-only를 순서와 상관없이 읽는다", () => {
  assert.deepEqual(parseReleaseArgs(["ios"]), { platform: "ios", buildOnly: false });
  assert.deepEqual(parseReleaseArgs(["android", "--build-only"]), { platform: "android", buildOnly: true });
  assert.deepEqual(parseReleaseArgs(["--build-only", "ios"]), { platform: "ios", buildOnly: true });
  assert.deepEqual(parseReleaseArgs(["--build-only"]), { platform: "all", buildOnly: true });
});

test("parseReleaseArgs는 모르는 값이나 플랫폼 2개를 throw한다", () => {
  assert.throws(() => parseReleaseArgs(["web"]));
  assert.throws(() => parseReleaseArgs(["iOS"]));
  assert.throws(() => parseReleaseArgs(["ios", "android"]));
  assert.throws(() => parseReleaseArgs(["--force"]));
});

test("findRemoteVersionProblems는 대상 플랫폼의 원격 빌드 번호가 있으면 문제가 없다", () => {
  assert.deepEqual(findRemoteVersionProblems("all", { versionCode: "22", buildNumber: "8" }), []);
  assert.deepEqual(findRemoteVersionProblems("android", { versionCode: "22" }), []);
  assert.deepEqual(findRemoteVersionProblems("ios", { buildNumber: "8" }), []);
});

test("findRemoteVersionProblems는 초기화되지 않은 플랫폼마다 pnpm exec eas build:version:set을 안내한다", () => {
  const problems = findRemoteVersionProblems("all", {});

  assert.equal(problems.length, 2);
  assert.match(problems[0], /pnpm exec eas build:version:set -p android/);
  assert.match(problems[1], /pnpm exec eas build:version:set -p ios/);
  assert.equal(findRemoteVersionProblems("android", { buildNumber: "8" }).length, 1);
});

test("findGitProblems는 main이고 깨끗하고 원격과 같으면 문제가 없다", () => {
  assert.deepEqual(findGitProblems(cleanState), []);
});

test("findGitProblems는 main이 아닌 브랜치를 막는다", () => {
  assert.equal(findGitProblems({ ...cleanState, branch: "feature/x" }).length, 1);
});

test("findGitProblems는 커밋하지 않은 파일과 추적하지 않는 파일을 목록과 함께 막는다", () => {
  const problems = findGitProblems({ ...cleanState, porcelain: " M app.json\n?? new-file.txt\n" });

  assert.equal(problems.length, 1);
  assert.match(problems[0], /app\.json/);
  assert.match(problems[0], /new-file\.txt/);
});

test("findGitProblems는 origin/main과 커밋이 다르면 막는다", () => {
  assert.equal(findGitProblems({ ...cleanState, remoteHead: "def" }).length, 1);
});

test("findGitProblems는 여러 문제를 함께 알려 준다", () => {
  const problems = findGitProblems({
    branch: "feature/x",
    porcelain: " M app.json\n",
    head: "abc",
    remoteHead: "def",
  });

  assert.equal(problems.length, 3);
});
