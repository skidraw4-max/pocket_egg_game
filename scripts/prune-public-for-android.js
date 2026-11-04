/**
 * Android AAB 업로드용 public 에셋 정리.
 * Play Console base 모듈 압축 다운로드 500MB 제한 대응.
 *
 * 제거 대상:
 * - 빌드/개발 전용 폴더 (런타임 미참조)
 * - status 스테이지 중복 (child/teen/adult/mythic == baby)
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = process.argv[2]
  ? path.resolve(process.argv[2])
  : path.join(ROOT, "dist", "public");

const REMOVE_DIRS = [
  "characters/status-illustrated",
  "characters/export",
  "characters/status-preview",
  "characters/cards",
  "legacy-cdn",
];

const DUPLICATE_STAGE_DIRS = ["child", "teen", "adult", "mythic"];

function rmrf(dirPath) {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

function dirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

function countFiles(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    count += entry.isDirectory() ? countFiles(full) : 1;
  }
  return count;
}

if (!fs.existsSync(target)) {
  console.error(`Target not found: ${target}`);
  process.exit(1);
}

const beforeBytes = dirSize(target);
const beforeFiles = countFiles(target);
let removedDirs = 0;
let removedStageDirs = 0;

for (const rel of REMOVE_DIRS) {
  const full = path.join(target, rel);
  if (fs.existsSync(full)) {
    rmrf(full);
    removedDirs += 1;
  }
}

const statusRoot = path.join(target, "characters", "status");
for (const skin of ["classic", "modern"]) {
  const skinDir = path.join(statusRoot, skin);
  if (!fs.existsSync(skinDir)) continue;
  for (const speciesEntry of fs.readdirSync(skinDir, { withFileTypes: true })) {
    if (!speciesEntry.isDirectory()) continue;
    const speciesDir = path.join(skinDir, speciesEntry.name);
    for (const stage of DUPLICATE_STAGE_DIRS) {
      const stageDir = path.join(speciesDir, stage);
      if (fs.existsSync(stageDir)) {
        rmrf(stageDir);
        removedStageDirs += 1;
      }
    }
  }
}

const afterBytes = dirSize(target);
const afterFiles = countFiles(target);
const savedMb = (beforeBytes - afterBytes) / 1024 / 1024;

console.log(`[prune-public-for-android] ${target}`);
console.log(
  `  removed ${removedDirs} dev folders, ${removedStageDirs} duplicate stage dirs`,
);
console.log(
  `  ${beforeFiles} files (${(beforeBytes / 1024 / 1024).toFixed(1)} MB) -> ${afterFiles} files (${(afterBytes / 1024 / 1024).toFixed(1)} MB), saved ${savedMb.toFixed(1)} MB`,
);

if (afterBytes > 450 * 1024 * 1024) {
  console.warn(
    "  WARN: public assets still >450MB uncompressed; compressed base may exceed 500MB.",
  );
}
