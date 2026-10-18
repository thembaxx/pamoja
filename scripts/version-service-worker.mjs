import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const hash = createHash("sha256");
async function include(directory) {
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await include(path);
    else if (path !== "public/sw.js") hash.update(path).update(await readFile(path));
  }
}
await include("src");
await include("public");
// Include dependencies and configuration because their changes can alter the app shell.
for (const path of ["package.json", "pnpm-lock.yaml", "next.config.ts"])
  hash.update(await readFile(path));
const source = await readFile("public/sw.js", "utf8");
hash.update(source.replace(/pamoja-static-[\w-]+/, "pamoja-static-VERSION"));
const version = hash.digest("hex").slice(0, 16);
await writeFile("public/sw.js", source.replace(/pamoja-static-[\w-]+/, `pamoja-static-${version}`));
console.log(`Service worker version: ${version}`);
