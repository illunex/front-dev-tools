const { test } = require("node:test");
const assert = require("node:assert/strict");

const {
  findWebUrlProblems,
  findSubmitProblems,
  findReleaseProblems,
  parseCheckArgs,
} = require("../check-release");

const filledEasJson = {
  submit: { production: { ios: { ascAppId: "1234567890" }, android: { track: "internal" } } },
};
const emptyIosEasJson = {
  submit: { production: { ios: { ascAppId: "" }, android: { track: "internal" } } },
};

test("findWebUrlProblems는 값이 없으면 EAS 환경 변수 등록을 안내한다", () => {
  const problems = findWebUrlProblems(undefined);

  assert.equal(problems.length, 1);
  assert.match(problems[0], /EXPO_PUBLIC_WEBVIEW_URL/);
  assert.match(problems[0], /체크리스트 5번/);
  assert.equal(findWebUrlProblems("").length, 1);
});

test("findWebUrlProblems는 https가 아니면 막는다", () => {
  const problems = findWebUrlProblems("http://example.com");

  assert.equal(problems.length, 1);
  assert.match(problems[0], /https/);
});

test("findWebUrlProblems는 IP나 localhost 주소를 막는다", () => {
  for (const url of ["https://192.168.0.10", "https://localhost:3000", "https://LOCALHOST"]) {
    const problems = findWebUrlProblems(url);
    assert.equal(problems.length, 1, url);
    assert.match(problems[0], /IP|localhost/, url);
  }
});

test("findWebUrlProblems는 https 도메인이면 문제가 없다", () => {
  assert.deepEqual(findWebUrlProblems("https://example.com"), []);
  assert.deepEqual(findWebUrlProblems("https://m.example.co.kr/path?x=1"), []);
});

test("findSubmitProblems는 iOS 대상인데 ascAppId가 비어 있으면 막는다", () => {
  const problems = findSubmitProblems(emptyIosEasJson, "ios");

  assert.equal(problems.length, 1);
  assert.match(problems[0], /ascAppId/);
});

test("findSubmitProblems는 대상 플랫폼 설정만 검사한다", () => {
  assert.deepEqual(findSubmitProblems(emptyIosEasJson, "android"), []);
  assert.equal(findSubmitProblems(emptyIosEasJson, "all").length, 1);
  assert.deepEqual(findSubmitProblems(filledEasJson, "all"), []);
});

test("findSubmitProblems는 android track이 없으면 막는다", () => {
  const easJson = { submit: { production: { ios: { ascAppId: "1" }, android: {} } } };

  assert.equal(findSubmitProblems(easJson, "android").length, 1);
});

test("findSubmitProblems는 eas.json을 읽지 못했으면 문제로 본다", () => {
  assert.equal(findSubmitProblems(null, "ios").length, 1);
  assert.equal(findSubmitProblems("not-object", "android").length, 1);
});

test("findReleaseProblems는 submit을 건너뛰면 submit 설정을 검사하지 않는다", () => {
  const base = { webViewUrl: "https://example.com", easJson: emptyIosEasJson, platform: "ios" };

  assert.deepEqual(findReleaseProblems({ ...base, submit: false }), []);
  assert.equal(findReleaseProblems({ ...base, submit: true }).length, 1);
});

test("findReleaseProblems는 URL과 submit 문제를 함께 알려 준다", () => {
  const problems = findReleaseProblems({
    webViewUrl: undefined,
    easJson: emptyIosEasJson,
    platform: "all",
    submit: true,
  });

  assert.equal(problems.length, 2);
});

test("parseCheckArgs는 워크플로가 넘긴 platform과 submit을 읽는다", () => {
  assert.deepEqual(parseCheckArgs(["--platform", "ios", "--submit", "false"]), {
    platform: "ios",
    submit: false,
  });
  assert.deepEqual(parseCheckArgs(["--platform", "all", "--submit", "true"]), {
    platform: "all",
    submit: true,
  });
});

test("parseCheckArgs는 모르는 platform이나 submit 값을 throw한다", () => {
  assert.throws(() => parseCheckArgs(["--platform", "web", "--submit", "true"]));
  assert.throws(() => parseCheckArgs(["--platform", "ios", "--submit", "yes"]));
  assert.throws(() => parseCheckArgs(["--platform", "ios"]));
});
