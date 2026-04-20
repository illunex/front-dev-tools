# conventions 설치 가이드

Claude Code · Codex · Cursor에 회사 공통 개발 컨벤션을 한 번에 설치합니다.

## 설치

```bash
curl -fsSL https://raw.githubusercontent.com/illunex/front-dev-tools/main/install/install-conventions.sh | bash
```

특정 툴만 설치하려면 플래그를 지정합니다.

```bash
# Claude Code만
curl -fsSL .../install-conventions.sh | bash -s -- --claude

# Codex만
curl -fsSL .../install-conventions.sh | bash -s -- --codex

# Cursor만
curl -fsSL .../install-conventions.sh | bash -s -- --cursor
```

## 설치되는 파일 위치

| 툴 | 설치 경로 |
| --- | --- |
| Claude Code | `~/.claude/CLAUDE.md` |
| Codex | `~/.codex/AGENTS.md` |
| Cursor | `~/.cursor/rules/company.mdc` |

기존 파일이 있으면 `*.bak.YYYYMMDDHHMMSS` 형태로 백업한 후 교체합니다.

## 어떤 파일이 설치되는지 미리 보기

```bash
curl -fsSL .../install-conventions.sh | bash -s -- --dry-run
```

## 컨벤션 커스터마이즈

설치 후 `TODO:` 주석이 달린 항목을 팀에 맞게 채웁니다.

**편집 권장 순서:**

1. `conventions/shared/conventions.md` — 단일 원본 편집
2. 각 툴 파일에 변경 내용 반영:
   - `conventions/claude/CLAUDE.md`
   - `conventions/codex/AGENTS.md`
   - `conventions/cursor/company.mdc`
3. `install-conventions.sh --force` 로 각자 재설치

## 컨벤션 업데이트

```bash
# 최신 버전으로 강제 업데이트 (기존 파일은 자동 백업)
curl -fsSL .../install-conventions.sh | bash -s -- --force
```

## Cursor — UI에서 User Rules로 설정하는 대안

파일 기반 설치가 적용되지 않는 환경에서는 아래 방법을 사용합니다.

1. `conventions/cursor/company.mdc` 파일을 열고 `---` 프론트매터를 제외한 본문만 복사
2. Cursor 앱 → **Settings** → **Rules** → **User Rules** 항목에 붙여넣기
3. 저장 후 재시작

## FAQ

**Q. 이미 `~/.claude/CLAUDE.md`가 있는데 덮어써도 되나요?**
기존 파일은 자동으로 `.bak.YYYYMMDDHHMMSS` 파일로 백업됩니다. 기존 내용을 컨벤션 파일에 수동으로 병합하거나, 백업 파일을 복원해 원하는 내용을 붙여넣으세요.

**Q. Codex `~/.codex/AGENTS.md`가 없으면 자동으로 생성되나요?**
네. 디렉토리(`~/.codex/`)도 존재하지 않으면 자동으로 생성됩니다.

**Q. 세 파일의 내용이 다르면 어떻게 동기화하나요?**
현재는 수동 동기화입니다. `conventions/shared/conventions.md`를 수정하고 세 파일에 붙여넣은 뒤 커밋·재설치하는 흐름을 권장합니다.
