import assert from "node:assert/strict";
import { test } from "node:test";
import * as path from "node:path";
import {
  findSiteRoot,
  resolveComponentDir,
  resolveComponentFile,
} from "../../services/component/ComponentResolver";

function fakeFs(existingPaths: string[]) {
  const set = new Set(existingPaths);
  return async (candidate: string) => set.has(candidate);
}

test("prefers local/components over bitrix/components", async () => {
  const root = "/site";
  const localDir = path.join(root, "local", "components", "bitrix", "catalog");
  const bitrixDir = path.join(root, "bitrix", "components", "bitrix", "catalog");
  const exists = fakeFs([localDir, bitrixDir]);

  const result = await resolveComponentDir("bitrix", "catalog", root, exists);

  assert.equal(result, localDir);
});

test("falls back to bitrix/components when not overridden in local", async () => {
  const root = "/site";
  const bitrixDir = path.join(root, "bitrix", "components", "bitrix", "catalog");
  const exists = fakeFs([bitrixDir]);

  const result = await resolveComponentDir("bitrix", "catalog", root, exists);

  assert.equal(result, bitrixDir);
});

test("returns null when the component exists nowhere", async () => {
  const exists = fakeFs([]);

  const result = await resolveComponentDir("bitrix", "catalog", "/site", exists);

  assert.equal(result, null);
});

test("resolveComponentFile points at component.php when present", async () => {
  const root = "/site";
  const dir = path.join(root, "local", "components", "bitrix", "catalog");
  const entry = path.join(dir, "component.php");
  const exists = fakeFs([dir, entry]);

  const result = await resolveComponentFile("bitrix", "catalog", root, exists);

  assert.equal(result, entry);
});

test("resolveComponentFile falls back to class.php when component.php is missing", async () => {
  const root = "/site";
  const dir = path.join(root, "local", "components", "xpage", "simple");
  const classFile = path.join(dir, "class.php");
  const exists = fakeFs([dir, classFile]);

  const result = await resolveComponentFile("xpage", "simple", root, exists);

  assert.equal(result, classFile);
});

test("resolveComponentFile falls back to the directory when neither component.php nor class.php exist", async () => {
  const root = "/site";
  const dir = path.join(root, "local", "components", "bitrix", "catalog");
  const exists = fakeFs([dir]);

  const result = await resolveComponentFile("bitrix", "catalog", root, exists);

  assert.equal(result, dir);
});

test("rejects '.' and '..' as namespace or name to avoid nonsensical path escapes", async () => {
  const exists = fakeFs(["/site", "/site/local", "/site/bitrix"]);

  assert.equal(await resolveComponentDir("..", "..", "/site", exists), null);
  assert.equal(await resolveComponentDir(".", "catalog", "/site", exists), null);
  assert.equal(await resolveComponentDir("bitrix", "..", "/site", exists), null);
});

test("resolveComponentFile returns null when the component is not found", async () => {
  const exists = fakeFs([]);

  const result = await resolveComponentFile("bitrix", "catalog", "/site", exists);

  assert.equal(result, null);
});

test("findSiteRoot finds the nearest ancestor with a bitrix/ folder", async () => {
  const siteRoot = "/home/eugeniy/work/apteka74/www/public";
  const startDir = path.join(siteRoot, "catalog");
  const exists = fakeFs([path.join(siteRoot, "bitrix", "modules")]);

  const result = await findSiteRoot(startDir, exists);

  assert.equal(result, siteRoot);
});

test("findSiteRoot works when starting directly in the site root", async () => {
  const siteRoot = "/site";
  const exists = fakeFs([path.join(siteRoot, "bitrix", "modules")]);

  const result = await findSiteRoot(siteRoot, exists);

  assert.equal(result, siteRoot);
});

test("findSiteRoot returns null when no ancestor has a bitrix/ folder", async () => {
  const exists = fakeFs([]);

  const result = await findSiteRoot("/some/random/project/src", exists);

  assert.equal(result, null);
});

test("findSiteRoot is not fooled by a bare bitrix/ folder without modules/ (e.g. a vendored IDE stub)", async () => {
  const siteRoot = "/site";
  const startDir = path.join(
    siteRoot,
    "local",
    "components",
    "vendor",
    "some-lib",
    "src"
  );
  // Only a bare "bitrix" dir exists partway up (no "modules" inside it),
  // simulating a composer-installed IDE stub package. The walk must skip
  // past it and keep going up to the real docroot.
  const exists = fakeFs([
    path.join(siteRoot, "local", "components", "vendor", "bitrix"),
    path.join(siteRoot, "bitrix", "modules"),
  ]);

  const result = await findSiteRoot(startDir, exists);

  assert.equal(result, siteRoot);
});

test("findSiteRoot gives up after MAX_SITE_ROOT_SEARCH_DEPTH levels", async () => {
  const deepStart = "/" + Array.from({ length: 40 }, (_, i) => `d${i}`).join("/");
  const exists = fakeFs([]);

  const result = await findSiteRoot(deepStart, exists);

  assert.equal(result, null);
});
