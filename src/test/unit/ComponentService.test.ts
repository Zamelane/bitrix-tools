import assert from "node:assert/strict";
import { test } from "node:test";
import * as path from "node:path";
import { ComponentService } from "../../services/component/ComponentService";

function fakeFs(existingPaths: string[]) {
  const set = new Set(existingPaths);
  return async (candidate: string) => set.has(candidate);
}

function fakeListDirectories(entries: Record<string, string[]> = {}) {
  return async (dirPath: string) => entries[dirPath] ?? [];
}

test("resolves both the component and its template, skipping calls that resolve to nothing", async () => {
  const root = "/site";
  const catalogEntry = path.join(
    root,
    "local",
    "components",
    "bitrix",
    "catalog",
    "component.php"
  );
  const templateEntry = path.join(
    root,
    "local",
    "components",
    "bitrix",
    "catalog",
    "templates",
    "catalog",
    "template.php"
  );
  const service = new ComponentService(
    fakeFs([
      path.join(root, "bitrix", "modules"),
      path.dirname(catalogEntry),
      catalogEntry,
      path.dirname(templateEntry),
      templateEntry,
    ]),
    fakeListDirectories()
  );
  const php = `
    IncludeComponent("bitrix:catalog", "catalog", []);
    IncludeComponent("bitrix:missing", "template", []);
  `;

  const links = await service.findLinks(php, root, null);

  assert.equal(links.length, 2);
  assert.equal(links[0].targetPath, catalogEntry);
  assert.equal(links[1].targetPath, templateEntry);
});

test("returns an empty list when the document isn't inside a Bitrix site", async () => {
  const service = new ComponentService(fakeFs([]), fakeListDirectories());

  const links = await service.findLinks(
    `IncludeComponent("bitrix:catalog", "catalog", []);`,
    "/some/random/project",
    null
  );

  assert.deepEqual(links, []);
});

test("finds the site root when the docroot is nested below the document", async () => {
  const siteRoot = "/home/eugeniy/work/apteka74/www/public";
  const documentDir = path.join(siteRoot, "catalog");
  const catalogEntry = path.join(
    siteRoot,
    "bitrix",
    "components",
    "bitrix",
    "catalog",
    "component.php"
  );
  const service = new ComponentService(
    fakeFs([
      path.join(siteRoot, "bitrix", "modules"),
      path.dirname(catalogEntry),
      catalogEntry,
    ]),
    fakeListDirectories()
  );

  const links = await service.findLinks(
    `IncludeComponent("bitrix:catalog", "catalog", []);`,
    documentDir,
    null
  );

  assert.equal(links.length, 1);
  assert.equal(links[0].targetPath, catalogEntry);
});

test("respects the configured siteTemplate when resolving the template link", async () => {
  const root = "/site";
  const wantedTemplate = path.join(
    root,
    "local",
    "templates",
    "site_two",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const otherTemplate = path.join(
    root,
    "local",
    "templates",
    "site_one",
    "components",
    "bitrix",
    "catalog",
    "catalog"
  );
  const service = new ComponentService(
    fakeFs([path.join(root, "bitrix", "modules"), wantedTemplate, otherTemplate]),
    fakeListDirectories({
      [path.join(root, "local", "templates")]: ["site_one", "site_two"],
    })
  );

  const links = await service.findLinks(
    `IncludeComponent("bitrix:catalog", "catalog", []);`,
    root,
    "site_two"
  );

  assert.equal(links.length, 1);
  assert.equal(links[0].targetPath, wantedTemplate);
});

test("falls back to class.php when the component has no component.php", async () => {
  const root = "/site";
  const classFile = path.join(
    root,
    "local",
    "components",
    "xpage",
    "simple",
    "class.php"
  );
  const service = new ComponentService(
    fakeFs([path.join(root, "bitrix", "modules"), path.dirname(classFile), classFile]),
    fakeListDirectories()
  );

  const links = await service.findLinks(
    `IncludeComponent("xpage:simple", "", []);`,
    root,
    null
  );

  const componentLink = links.find((link) => link.targetPath === classFile);
  assert.ok(componentLink, "expected a link resolving to class.php");
});
