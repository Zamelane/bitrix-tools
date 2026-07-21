import assert from "node:assert/strict";
import { test } from "node:test";
import { findComponentReferences } from "./componentParser";

test("finds a single IncludeComponent call", () => {
  const php = `$APPLICATION->IncludeComponent(\n  "bitrix:catalog",\n  "catalog",\n  []\n);`;

  const refs = findComponentReferences(php);

  assert.equal(refs.length, 1);
  assert.equal(refs[0].namespace, "bitrix");
  assert.equal(refs[0].name, "catalog");
});

test("reports the character range of the component id, excluding quotes", () => {
  const php = `IncludeComponent("bitrix:catalog", "catalog", []);`;

  const [ref] = findComponentReferences(php);

  assert.equal(php.slice(ref.start, ref.end), "bitrix:catalog");
});

test("finds multiple calls in one file", () => {
  const php = `
    IncludeComponent("bitrix:catalog", "catalog", []);
    IncludeComponent("bitrix:catalog.section", "list", []);
  `;

  const refs = findComponentReferences(php);

  assert.equal(refs.length, 2);
  assert.deepEqual(
    refs.map((r) => r.name),
    ["catalog", "catalog.section"]
  );
});

test("supports dots and dashes in component names", () => {
  const php = `IncludeComponent("my.company:catalog.element-view", "", []);`;

  const [ref] = findComponentReferences(php);

  assert.equal(ref.namespace, "my.company");
  assert.equal(ref.name, "catalog.element-view");
});

test("returns an empty array when there are no calls", () => {
  const php = `echo "hello world";`;

  const refs = findComponentReferences(php);

  assert.equal(refs.length, 0);
});

test("allows hyphens in vendor namespaces", () => {
  const php = `IncludeComponent("my-company:catalog", "", []);`;

  const [ref] = findComponentReferences(php);

  assert.equal(ref.namespace, "my-company");
  assert.equal(ref.name, "catalog");
});

test("handles single-quoted calls", () => {
  const php = `IncludeComponent('bitrix:catalog', 'catalog', []);`;

  const [ref] = findComponentReferences(php);

  assert.equal(ref.namespace, "bitrix");
  assert.equal(ref.name, "catalog");
});
