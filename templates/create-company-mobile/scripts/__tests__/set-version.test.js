const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { isValidVersion, readAppVersion, writeVersion } = require("../set-version");

// JSON.stringify로 다시 쓰면 깨지는 인라인 배열을 넣어 원래 포맷이 유지되는지 확인한다.
const APP_JSON_FIXTURE = `{
  "expo": {
    "name": "Sample App",
    "version": "1.0.0",
    "orientation": "portrait",
    "plugins": [["expo-splash-screen", { "imageWidth": 200 }]]
  }
}
`;

let root;

function readAppJson() {
  return fs.readFileSync(path.join(root, "app.json"), "utf8");
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "set-version-"));
  fs.writeFileSync(path.join(root, "app.json"), APP_JSON_FIXTURE);
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
});

test("readAppVersion은 app.json의 expo.version을 읽는다", () => {
  assert.equal(readAppVersion(APP_JSON_FIXTURE), "1.0.0");
});

test("writeVersion은 version 줄만 바꾸고 나머지 포맷은 그대로 둔다", () => {
  writeVersion(root, "1.2.3");

  assert.equal(readAppJson(), APP_JSON_FIXTURE.replace('"version": "1.0.0"', '"version": "1.2.3"'));
});

test("writeVersion은 x.y.z 형식이 아니면 파일을 건드리지 않고 throw한다", () => {
  for (const version of ["1.2", "v1.2.3", "1.2.3-beta", ""]) {
    assert.equal(isValidVersion(version), false, version);
    assert.throws(() => writeVersion(root, version), undefined, version);
  }

  assert.equal(readAppJson(), APP_JSON_FIXTURE);
});

test("writeVersion은 version 항목이 1번이 아니면 throw한다", () => {
  const duplicated = APP_JSON_FIXTURE.replace(
    '"name": "Sample App",',
    '"name": "Sample App",\n    "_note": { "version": "1.0.0" },',
  );
  fs.writeFileSync(path.join(root, "app.json"), duplicated);

  assert.throws(() => writeVersion(root, "1.2.3"), /1번/);
  assert.equal(readAppJson(), duplicated);
});
