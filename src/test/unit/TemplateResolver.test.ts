import assert from "node:assert/strict";
import { test } from "node:test";
import * as path from "node:path";
import {
  resolveTemplateDir,
  resolveTemplateFile,
} from "../../services/component/TemplateResolver";

function fakeFs(existingPaths: string[]) {
  const set = new Set(existingPaths);
  return async (candidate: string) => set.has(candidate);
}

function fakeListDirectories(entries: Record<string, string[]>) {
  return async (dirPath: string) => entries[dirPath] ?? [];
}

const ROOT = "/site";

test("resolves via the only site template found on disk", async () => {
  const templateDir = path.join(
    ROOT,
    "local",
    "templates",
    "aspro_max",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const exists = fakeFs([templateDir]);
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["aspro_max"],
  });

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: templateDir });
});

test("prefers the configured bitrixTools.siteTemplate when multiple exist", async () => {
  const wantedDir = path.join(
    ROOT,
    "local",
    "templates",
    "site_two",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const otherDir = path.join(
    ROOT,
    "local",
    "templates",
    "site_one",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const exists = fakeFs([wantedDir, otherDir]);
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["site_one", "site_two"],
  });

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    "site_two",
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: wantedDir });
});

test("reports ambiguous with every matching candidate when multiple site templates match and no setting is configured", async () => {
  const alphaDir = path.join(
    ROOT,
    "local",
    "templates",
    "alpha",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const betaDir = path.join(
    ROOT,
    "local",
    "templates",
    "beta",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const exists = fakeFs([alphaDir, betaDir]);
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["beta", "alpha"],
  });

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, {
    kind: "ambiguous",
    candidates: [
      { siteTemplateName: "alpha", path: alphaDir },
      { siteTemplateName: "beta", path: betaDir },
    ],
  });
});

test("does not fall through to bitrix/templates when local/templates is ambiguous", async () => {
  const alphaDir = path.join(
    ROOT,
    "local",
    "templates",
    "alpha",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const betaDir = path.join(
    ROOT,
    "local",
    "templates",
    "beta",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const bitrixDir = path.join(
    ROOT,
    "bitrix",
    "templates",
    "gamma",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const exists = fakeFs([alphaDir, betaDir, bitrixDir]);
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["beta", "alpha"],
    [path.join(ROOT, "bitrix", "templates")]: ["gamma"],
  });

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.equal(result.kind, "ambiguous");
  if (result.kind === "ambiguous") {
    assert.equal(result.candidates.length, 2);
  }
});

test("without a configured setting, resolves directly when only one site template matches", async () => {
  const aDir = path.join(
    ROOT,
    "local",
    "templates",
    "alpha",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const exists = fakeFs([aDir]);
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["beta", "alpha"],
  });

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: aDir });
});

test("falls back to the component's own bundled template when no site template has it", async () => {
  const bundledDir = path.join(
    ROOT,
    "local",
    "components",
    "bitrix",
    "catalog",
    "templates",
    "catalog"
  );
  const exists = fakeFs([bundledDir]);
  const listDirectories = fakeListDirectories({});

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: bundledDir });
});

test("treats an empty template name as the .default folder", async () => {
  const defaultDir = path.join(
    ROOT,
    "local",
    "components",
    "bitrix",
    "catalog",
    "templates",
    ".default"
  );
  const exists = fakeFs([defaultDir]);
  const listDirectories = fakeListDirectories({});

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: defaultDir });
});

test("returns none when the template exists nowhere", async () => {
  const exists = fakeFs([]);
  const listDirectories = fakeListDirectories({});

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "none" });
});

test("refuses to resolve a template name containing path separators, even if it bypasses the parser", async () => {
  // Proves rejection comes from segment validation, not missing file.
  const exists = async () => true;
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["aspro_max"],
  });

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "../../../../../../etc/passwd",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "none" });
});

test("ignores a configured siteTemplate that contains path separators and falls back to auto-detect", async () => {
  const validDir = path.join(
    ROOT,
    "local",
    "templates",
    "aspro_max",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const exists = fakeFs([validDir]);
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["aspro_max"],
  });

  const result = await resolveTemplateDir(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    "../../../../etc",
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: validDir });
});

test("resolveTemplateFile points at template.php when present", async () => {
  const templateDir = path.join(
    ROOT,
    "local",
    "components",
    "bitrix",
    "catalog",
    "templates",
    "catalog"
  );
  const entryFile = path.join(templateDir, "template.php");
  const exists = fakeFs([templateDir, entryFile]);
  const listDirectories = fakeListDirectories({});

  const result = await resolveTemplateFile(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: entryFile });
});

test("resolveTemplateFile falls back to the directory when template.php is missing", async () => {
  const templateDir = path.join(
    ROOT,
    "local",
    "components",
    "bitrix",
    "catalog",
    "templates",
    "catalog"
  );
  const exists = fakeFs([templateDir]);
  const listDirectories = fakeListDirectories({});

  const result = await resolveTemplateFile(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, { kind: "resolved", path: templateDir });
});

test("resolveTemplateFile resolves template.php per candidate when ambiguous", async () => {
  const alphaDir = path.join(
    ROOT,
    "local",
    "templates",
    "alpha",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const alphaEntry = path.join(alphaDir, "template.php");
  const betaDir = path.join(
    ROOT,
    "local",
    "templates",
    "beta",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const exists = fakeFs([alphaDir, alphaEntry, betaDir]);
  const listDirectories = fakeListDirectories({
    [path.join(ROOT, "local", "templates")]: ["beta", "alpha"],
  });

  const result = await resolveTemplateFile(
    "bitrix",
    "catalog",
    "catalog",
    ROOT,
    null,
    exists,
    listDirectories
  );

  assert.deepEqual(result, {
    kind: "ambiguous",
    candidates: [
      { siteTemplateName: "alpha", path: alphaEntry },
      { siteTemplateName: "beta", path: betaDir },
    ],
  });
});
