#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const args = parseArgs(process.argv.slice(2));

if (!args.framework || !["next", "react"].includes(args.framework)) {
  fail("Missing --framework. Expected one of: next, react");
}

if (!args.name) {
  fail("Missing --name.");
}

const parentDirectory = resolve(args.directory ?? process.cwd());
const projectDirectory = resolve(parentDirectory, args.name);

if (existsSync(projectDirectory)) {
  fail(`Target directory already exists: ${projectDirectory}`);
}

ensureCommand("pnpm");
mkdirSync(parentDirectory, { recursive: true });

if (args.framework === "next") {
  // 라우터가 루트 app/에 있어야 src/app을 FSD app 레이어로 쓸 수 있다.
  run("pnpm", [
    "dlx",
    "create-next-app@latest",
    args.name,
    "--typescript",
    "--eslint",
    "--tailwind",
    "--app",
    "--no-src-dir",
    "--import-alias",
    "@/*",
    "--use-pnpm",
    "--yes",
  ], parentDirectory);
} else {
  // pnpm create에 `--`를 넘기면 --template이 무시되어 vanilla 템플릿이 생성된다.
  run("pnpm", [
    "create",
    "vite@latest",
    args.name,
    "--template",
    "react-ts",
    "--no-interactive",
  ], parentDirectory);
}

applyCompanyStructure(projectDirectory, args.framework);

if (!args.skipInstall) {
  const dependencies = [
    "axios",
    "@tanstack/react-query",
    "zustand",
    "zod",
    "clsx",
    "tailwind-merge",
  ];

  if (args.framework === "react") {
    // react-router-dom은 같은 버전의 react-router에 고정되어 있어, 최신 8.x와 섞으면 라우터가 두 벌 설치된다.
    dependencies.push("react-router@7", "react-router-dom@7");
  }

  run("pnpm", ["add", ...dependencies], projectDirectory);
}

if (!args.skipVerify) {
  const packageJson = readJson(join(projectDirectory, "package.json"));
  const scripts = packageJson.scripts ?? {};

  if (scripts.lint) {
    run("pnpm", ["lint"], projectDirectory);
  }

  if (scripts.build) {
    run("pnpm", ["build"], projectDirectory);
  }
}

console.log(`\nCreated company frontend project at ${projectDirectory}`);

function applyCompanyStructure(root, framework) {
  const directories = [
    "src/app/providers",
    "src/views/home/ui/HomeScreen",
    "src/widgets",
    "src/features",
    "src/entities",
    "src/shared/api",
    "src/shared/config",
    "src/shared/hooks",
    "src/shared/lib",
    "src/shared/model",
    "src/shared/styles",
    "src/shared/ui",
  ];

  for (const directory of directories) {
    mkdirSync(join(root, directory), { recursive: true });
  }

  writeProjectFile(root, "src/app/providers/index.tsx", `"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import type { ReactNode } from "react";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
`);

  writeProjectFile(root, "src/views/home/index.ts", `export { HomeScreen } from "./ui/HomeScreen";
`);

  writeProjectFile(root, "src/views/home/ui/HomeScreen/index.tsx", `import { styles } from "./style";

export function HomeScreen() {
  return (
    <main style={styles.root}>
      <section style={styles.section}>
        <p style={styles.eyebrow}>Company frontend</p>
        <h1 style={styles.title}>프로젝트가 준비되었습니다.</h1>
      </section>
    </main>
  );
}
`);

  writeProjectFile(root, "src/views/home/ui/HomeScreen/style.ts", `import type { CSSProperties } from "react";

export const styles = {
  root: {
    minHeight: "100dvh",
    background: "#ffffff",
    color: "#111827",
  },
  section: {
    display: "flex",
    minHeight: "100dvh",
    width: "100%",
    maxWidth: "64rem",
    flexDirection: "column",
    justifyContent: "center",
    margin: "0 auto",
    padding: "4rem 1.5rem",
  },
  eyebrow: {
    color: "#6b7280",
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  title: {
    marginTop: "0.75rem",
    fontSize: "1.875rem",
    fontWeight: 600,
    letterSpacing: 0,
  },
} satisfies Record<string, CSSProperties>;
`);

  writeProjectFile(root, "src/shared/config/env.ts", `export type AppEnvironment = "local" | "development" | "staging" | "production";
`);

  if (framework === "next") {
    applyNextFiles(root);
  } else {
    applyReactFiles(root);
  }

  applyTypeScriptAlias(root, framework);
}

function applyNextFiles(root) {
  writeProjectFile(root, "src/shared/api/client.ts", `import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
`);

  writeProjectFile(root, "app/page.tsx", `import { HomeScreen } from "@/views/home";

export default function HomePage() {
  return <HomeScreen />;
}
`);

  const layoutPath = join(root, "app/layout.tsx");
  if (existsSync(layoutPath)) {
    let layout = readFileSync(layoutPath, "utf8");

    if (!layout.includes("<Providers>")) {
      layout = `import { Providers } from "@/app/providers";\n${layout}`.replace(
        /<body([^>]*)>\s*{children}\s*<\/body>/s,
        "<body$1><Providers>{children}</Providers></body>",
      );
    }

    // 루트 app/은 라우팅만 맡기므로 전역 스타일은 shared로 옮긴다.
    if (existsSync(join(root, "app/globals.css")) && layout.includes('"./globals.css"')) {
      moveProjectFile(root, "app/globals.css", "src/shared/styles/globals.css");
      layout = layout.replace('"./globals.css"', '"@/shared/styles/globals.css"');
    }

    writeFileSync(layoutPath, layout);
  }

  writeProjectFile(root, ".env.example", `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
`);
}

function applyReactFiles(root) {
  writeProjectFile(root, "src/shared/api/client.ts", `import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
`);

  // 공식 템플릿의 데모 화면은 쓰지 않으므로 src/에 FSD 레이어만 남긴다.
  for (const path of ["src/App.tsx", "src/App.css", "src/assets"]) {
    rmSync(join(root, path), { recursive: true, force: true });
  }
  moveProjectFile(root, "src/index.css", "src/shared/styles/index.css");

  writeProjectFile(root, "src/views/not-found/index.ts", `export { NotFoundScreen } from "./ui/NotFoundScreen";
`);

  writeProjectFile(root, "src/views/not-found/ui/NotFoundScreen/index.tsx", `import { Link } from "react-router";
import { styles } from "./style";

export function NotFoundScreen() {
  return (
    <main style={styles.root}>
      <h1 style={styles.title}>페이지를 찾을 수 없습니다.</h1>
      <Link to="/" style={styles.link}>
        홈으로 돌아가기
      </Link>
    </main>
  );
}
`);

  writeProjectFile(root, "src/views/not-found/ui/NotFoundScreen/style.ts", `import type { CSSProperties } from "react";

export const styles = {
  root: {
    display: "flex",
    minHeight: "100dvh",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    padding: "4rem 1.5rem",
    background: "#ffffff",
    color: "#111827",
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: 600,
    letterSpacing: 0,
  },
  link: {
    color: "#6b7280",
    fontSize: "0.875rem",
    fontWeight: 500,
  },
} satisfies Record<string, CSSProperties>;
`);

  writeProjectFile(root, "src/app/routes/index.tsx", `import { createBrowserRouter } from "react-router";
import { HomeScreen } from "@/views/home";
import { NotFoundScreen } from "@/views/not-found";

export const router = createBrowserRouter([
  { path: "/", element: <HomeScreen /> },
  { path: "*", element: <NotFoundScreen /> },
]);
`);

  writeProjectFile(root, "src/app/App.tsx", `import { RouterProvider } from "react-router/dom";
import { router } from "./routes";

export function App() {
  return <RouterProvider router={router} />;
}
`);

  writeProjectFile(root, "src/main.tsx", `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@/app/providers";
import { App } from "@/app/App";
import "@/shared/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Providers>
      <App />
    </Providers>
  </StrictMode>,
);
`);

  writeProjectFile(root, "vite.config.ts", `import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
`);

  writeProjectFile(root, ".env.example", `VITE_API_BASE_URL=http://localhost:3000
`);
}

function applyTypeScriptAlias(root, framework) {
  if (framework === "react") {
    mergeTsConfig(join(root, "tsconfig.app.json"));
    mergeTsConfig(join(root, "tsconfig.json"));
    return;
  }

  mergeTsConfig(join(root, "tsconfig.json"));
}

function mergeTsConfig(path) {
  if (!existsSync(path)) {
    return;
  }

  const config = readJson(path);
  config.compilerOptions = config.compilerOptions ?? {};
  config.compilerOptions.paths = {
    ...(config.compilerOptions.paths ?? {}),
    "@/*": ["./src/*"],
  };
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
}

function writeProjectFile(root, relativePath, content) {
  const path = join(root, relativePath);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function moveProjectFile(root, fromRelativePath, toRelativePath) {
  const target = join(root, toRelativePath);
  mkdirSync(dirname(target), { recursive: true });
  renameSync(join(root, fromRelativePath), target);
}

function readJson(path) {
  // Vite tsconfig에는 주석이 있다. "@/*"처럼 문자열에도 /*가 들어가므로 문자열 밖의 주석만 지운다.
  const source = readFileSync(path, "utf8").replace(
    /("(?:\\.|[^"\\])*")|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g,
    (_match, string) => string ?? "",
  );
  return JSON.parse(source);
}

function run(command, commandArgs, cwd) {
  const result = spawnSync(command, commandArgs, {
    cwd,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    fail(`Command failed: ${command} ${commandArgs.join(" ")}`);
  }
}

function ensureCommand(command) {
  const result = spawnSync(command, ["--version"], {
    stdio: "ignore",
    shell: false,
  });

  if (result.status !== 0) {
    fail(`Required command not found: ${command}`);
  }
}

function parseArgs(argv) {
  const parsed = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--framework") {
      parsed.framework = argv[++index];
    } else if (arg === "--name") {
      parsed.name = argv[++index];
    } else if (arg === "--directory") {
      parsed.directory = argv[++index];
    } else if (arg === "--skip-install") {
      parsed.skipInstall = true;
    } else if (arg === "--skip-verify") {
      parsed.skipVerify = true;
    } else if (arg === "-h" || arg === "--help") {
      printHelp();
      process.exit(0);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function printHelp() {
  console.log(`Usage:
  create-company-frontend --framework <next|react> --name <project-name> [options]

Options:
  --directory <path>  Parent directory for the generated project
  --skip-install      Skip adding company standard dependencies
  --skip-verify       Skip pnpm lint/build verification
`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
