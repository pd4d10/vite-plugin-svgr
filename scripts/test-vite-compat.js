import { lstat, mkdtemp, readlink, realpath, rename, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const rootDir = process.cwd();
const nodeModulesDir = path.join(rootDir, "node_modules");
const viteLinkPath = path.join(nodeModulesDir, "vite");
const backupDir = await mkdtemp(path.join(tmpdir(), "vite-plugin-svgr-vite-backup-"));
const backupLinkPath = path.join(backupDir, "vite");

const viteAliases = [
  "vite3",
  "vite4",
  "vite5",
  "vite6",
  "vite7",
  "vite8",
];

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
    });
    child.on("error", reject);
  });
}

async function switchVite(aliasName) {
  const aliasLinkPath = path.join(nodeModulesDir, aliasName);
  const aliasStats = await lstat(aliasLinkPath);

  if (!aliasStats.isSymbolicLink() && !aliasStats.isDirectory()) {
    throw new Error(`${aliasName} is not an installed package link`);
  }

  await rm(viteLinkPath, { force: true, recursive: true });
  await symlink(await realpath(aliasLinkPath), viteLinkPath, "dir");
}

const originalViteTarget = await readlink(viteLinkPath);
await rename(viteLinkPath, backupLinkPath);

try {
  for (const aliasName of viteAliases) {
    await switchVite(aliasName);

    console.log(`\n==> Testing with ${aliasName}`);
    await run("node", ["-p", "require('./node_modules/vite/package.json').version"]);
    await run("pnpm", ["test:e2e"]);
  }
} finally {
  await rm(viteLinkPath, { force: true, recursive: true });
  await symlink(originalViteTarget, viteLinkPath, "dir");
  await rm(backupLinkPath, { force: true, recursive: true });
  await rm(backupDir, { force: true, recursive: true });
}
