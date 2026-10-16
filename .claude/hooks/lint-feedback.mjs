// PostToolUse hook (Write|Edit): runs ESLint on the edited file and feeds errors back to Claude.
// Exit 2 on a PostToolUse hook does not undo the edit; it shows stderr to Claude so it fixes the file.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const LINTED = /\.(ts|mjs|js|astro)$/;
const projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const input = JSON.parse(readFileSync(0, "utf8"));
const filePath = input.tool_input?.file_path ?? "";

if (LINTED.test(filePath) && filePath.startsWith(projectDir)) {
  const eslint = join(projectDir, "node_modules", ".bin", "eslint");
  const result = spawnSync(eslint, ["--no-color", filePath], {
    cwd: projectDir,
    encoding: "utf8",
  });
  // 1 = lint errors, 2 = ESLint crashed. Report both so a broken linter never passes silently.
  if (result.status !== 0) {
    process.stderr.write(
      `ESLint failed on ${filePath}:\n${result.stdout}${result.stderr}`,
    );
    process.exit(2);
  }
}
