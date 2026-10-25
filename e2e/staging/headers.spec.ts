import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test, expect } from "@playwright/test";

// The production site serves public/_headers exactly. statichost.eu reads the file from the publish
// root and uses the last matched occurrence of each header (https://www.statichost.eu/docs/custom-headers/).
// Run with pnpm test:e2e:staging; playwright.staging.config.ts supplies the URL.

const blocks = new Map<string, Array<[string, string]>>();
let current: Array<[string, string]> = [];
for (const line of readFileSync("public/_headers", "utf-8").split("\n")) {
  const header = line.match(/^\s+([^:]+):\s*(.+)$/);
  if (header) current.push([header[1].toLowerCase(), header[2]]);
  else if (line.trim()) blocks.set(line.trim(), (current = []));
}

const siteWide = blocks.get("*");
const assets = blocks.get("/_astro/*");
assert(
  siteWide !== undefined && assets !== undefined,
  "public/_headers lacks the * or /_astro/* block",
);

// A real hashed asset of this build; dist/ must come from the commit production serves.
const asset = readdirSync("dist/_astro").find((file) =>
  /\.(css|js)$/.test(file),
);
assert(
  asset !== undefined,
  "dist/_astro has no css or js file: run pnpm build first",
);

test("serves every site-wide header with its exact value", async ({
  request,
}) => {
  const response = await request.get("/");
  expect(response.status()).toBe(200);
  const served = response.headers();
  for (const [name, value] of siteWide)
    expect.soft(served[name], name).toBe(value);
});

test("serves the /_astro/* cache rule on a built asset", async ({
  request,
}) => {
  const response = await request.get(`/_astro/${asset}`);
  expect(response.status()).toBe(200);
  const served = response.headers();
  for (const [name, value] of assets)
    expect.soft(served[name], name).toBe(value);
});
