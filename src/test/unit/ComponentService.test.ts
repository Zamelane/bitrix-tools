import assert from "node:assert/strict";
import { test } from "node:test";
import * as path from "node:path";
import { ComponentService } from "../../services/component/ComponentService";

function fakeFs(existingPaths: string[]) {
  const set = new Set(existingPaths);
  return async (candidate: string) => set.has(candidate);
}

test("resolves every matched component to its file, skipping ones that don't exist", async () => {
  const root = "/site";
  const catalogEntry = path.join(
    root,
    "local",
    "components",
    "bitrix",
    "catalog",
    "component.php"
  );
  const service = new ComponentService(
    fakeFs([path.dirname(catalogEntry), catalogEntry])
  );
  const php = `
    IncludeComponent("bitrix:catalog", "catalog", []);
    IncludeComponent("bitrix:missing", "template", []);
  `;

  const links = await service.findComponentLinks(php, [root]);

  assert.equal(links.length, 1);
  assert.equal(links[0].reference.name, "catalog");
  assert.equal(links[0].targetPath, catalogEntry);
});

test("returns an empty list when nothing resolves", async () => {
  const service = new ComponentService(fakeFs([]));

  const links = await service.findComponentLinks(
    `IncludeComponent("bitrix:catalog", "catalog", []);`,
    ["/site"]
  );

  assert.deepEqual(links, []);
});
