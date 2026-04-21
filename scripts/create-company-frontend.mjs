#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  run("pnpm", [
    "dlx",
    "create-next-app@latest",
    args.name,
    "--typescript",
    "--eslint",
    "--tailwind",
    "--app",
    "--src-dir",
    "--import-alias",
    "@/*",
    "--use-pnpm",
    "--yes",
  ], parentDirectory);
} else {
  run("pnpm", [
    "create",
    "vite@latest",
    args.name,
    "--",
    "--template",
    "react-ts",
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
    dependencies.push("react-router-dom");
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
    "src/app",
    "src/screen/home/homeScreen",
    "src/features/common/api",
    "src/features/common/components",
    "src/features/common/constants",
    "src/features/common/queries",
    "src/features/common/store",
    "src/features/common/types",
    "src/features/common/utils",
    "src/components/layouts",
    "src/components/ui",
    "src/apis",
    "src/hooks",
    "src/lib",
    "src/store",
    "src/constants",
    "src/types",
    "src/utils",
    "src/styles",
  ];

  for (const directory of directories) {
    mkdirSync(join(root, directory), { recursive: true });
  }

  writeProjectFile(root, "src/app/providers.tsx", `"use client";

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

  writeProjectFile(root, "src/screen/home/homeScreen/index.tsx", `import { styles } from "./style";

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

  writeProjectFile(root, "src/screen/home/homeScreen/style.ts", `import type { CSSProperties } from "react";

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

  writeProjectFile(root, "src/types/env.ts", `export type AppEnvironment = "local" | "development" | "staging" | "production";
`);

  if (framework === "next") {
    applyNextFiles(root);
  } else {
    applyReactFiles(root);
  }

  applyTypeScriptAlias(root, framework);
}

function applyNextFiles(root) {
  writeProjectFile(root, "src/apis/client.ts", `import axios from "axios";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
`);

  writeProjectFile(root, "src/app/page.tsx", `import { HomeScreen } from "@/screen/home/homeScreen";

export default function HomePage() {
  return <HomeScreen />;
}
`);

  const layoutPath = join(root, "src/app/layout.tsx");
  if (existsSync(layoutPath)) {
    const current = readFileSync(layoutPath, "utf8");
    if (!current.includes("<Providers>")) {
      const withImport = current.includes('from "./providers"')
        ? current
        : `import { Providers } from "./providers";\n${current}`;
      const withProvider = withImport.replace(
        /<body([^>]*)>\s*{children}\s*<\/body>/s,
        "<body$1><Providers>{children}</Providers></body>",
      );
      writeFileSync(layoutPath, withProvider);
    }
  }

  writeProjectFile(root, ".env.example", `NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
`);
}

function applyReactFiles(root) {
  writeProjectFile(root, "src/apis/client.ts", `import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});
`);

  writeProjectFile(root, "src/app/App.tsx", `import { HomeScreen } from "@/screen/home/homeScreen";

export function App() {
  return <HomeScreen />;
}
`);

  writeProjectFile(root, "src/main.tsx", `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@/app/providers";
import { App } from "@/app/App";
import "./index.css";

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
  config.compilerOptions.baseUrl = ".";
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

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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
