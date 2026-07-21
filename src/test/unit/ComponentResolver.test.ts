import assert from "node:assert/strict";
import { test } from "node:test";
import * as path from "node:path";
import {
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

  const result = await resolveComponentDir("bitrix", "catalog", [root], exists);

  assert.equal(result, localDir);
});

test("falls back to bitrix/components when not overridden in local", async () => {
  const root = "/site";
  const bitrixDir = path.join(root, "bitrix", "components", "bitrix", "catalog");
  const exists = fakeFs([bitrixDir]);

  const result = await resolveComponentDir("bitrix", "catalog", [root], exists);

  assert.equal(result, bitrixDir);
});

test("returns null when the component exists nowhere", async () => {
  const exists = fakeFs([]);

  const result = await resolveComponentDir("bitrix", "catalog", ["/site"], exists);

  assert.equal(result, null);
});

test("checks every workspace root before falling back to bitrix/", async () => {
  const rootA = "/site-a";
  const rootB = "/site-b";
  const localInB = path.join(rootB, "local", "components", "bitrix", "catalog");
  const bitrixInA = path.join(rootA, "bitrix", "components", "bitrix", "catalog");
  const exists = fakeFs([localInB, bitrixInA]);

  const result = await resolveComponentDir("bitrix", "catalog", [rootA, rootB], exists);

  assert.equal(result, localInB);
});

test("resolveComponentFile points at component.php when present", async () => {
  const root = "/site";
  const dir = path.join(root, "local", "components", "bitrix", "catalog");
  const entry = path.join(dir, "component.php");
  const exists = fakeFs([dir, entry]);

  const result = await resolveComponentFile("bitrix", "catalog", [root], exists);

  assert.equal(result, entry);
});

test("resolveComponentFile falls back to the directory when component.php is missing", async () => {
  const root = "/site";
  const dir = path.join(root, "local", "components", "bitrix", "catalog");
  const exists = fakeFs([dir]);

  const result = await resolveComponentFile("bitrix", "catalog", [root], exists);

  assert.equal(result, dir);
});

test("rejects '.' and '..' as namespace or name to avoid nonsensical path escapes", async () => {
  const exists = fakeFs(["/site", "/site/local", "/site/bitrix"]);

  assert.equal(await resolveComponentDir("..", "..", ["/site"], exists), null);
  assert.equal(await resolveComponentDir(".", "catalog", ["/site"], exists), null);
  assert.equal(await resolveComponentDir("bitrix", "..", ["/site"], exists), null);
});

test("resolveComponentFile returns null when the component is not found", async () => {
  const exists = fakeFs([]);

  const result = await resolveComponentFile("bitrix", "catalog", ["/site"], exists);

  assert.equal(result, null);
});
