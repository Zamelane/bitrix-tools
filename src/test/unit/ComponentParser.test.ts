import assert from "node:assert/strict";
import { test } from "node:test";
import { findIncludeComponentCalls } from "../../services/component/ComponentParser";

test("finds a single IncludeComponent call with component and template ranges", () => {
  const php = `$APPLICATION->IncludeComponent(\n  "bitrix:catalog",\n  "catalog",\n  []\n);`;

  const [call] = findIncludeComponentCalls(php);

  assert.equal(call.component.namespace, "bitrix");
  assert.equal(call.component.name, "catalog");
  assert.equal(php.slice(call.component.start, call.component.end), "bitrix:catalog");

  assert.equal(call.template.templateName, "catalog");
  assert.equal(php.slice(call.template.start, call.template.end), "catalog");
});

test("anchors an empty template name to the quote pair so the link stays clickable", () => {
  const php = `IncludeComponent("bitrix:catalog", "", []);`;

  const [call] = findIncludeComponentCalls(php);

  assert.equal(call.template.templateName, "");
  assert.equal(php.slice(call.template.start, call.template.end), '""');
});

test("does not match a template argument containing path separators (defends against path traversal)", () => {
  const php = `IncludeComponent("bitrix:catalog", "../../../../etc/passwd", []);`;

  const calls = findIncludeComponentCalls(php);

  assert.equal(calls.length, 0);
});

test("finds multiple calls in one file", () => {
  const php = `
    IncludeComponent("bitrix:catalog", "catalog", []);
    IncludeComponent("bitrix:catalog.section", "list", []);
  `;

  const calls = findIncludeComponentCalls(php);

  assert.equal(calls.length, 2);
  assert.deepEqual(
    calls.map((c) => c.component.name),
    ["catalog", "catalog.section"]
  );
  assert.deepEqual(
    calls.map((c) => c.template.templateName),
    ["catalog", "list"]
  );
});

test("supports dots and dashes in component names", () => {
  const php = `IncludeComponent("my.company:catalog.element-view", "custom-tpl", []);`;

  const [call] = findIncludeComponentCalls(php);

  assert.equal(call.component.namespace, "my.company");
  assert.equal(call.component.name, "catalog.element-view");
  assert.equal(call.template.templateName, "custom-tpl");
});

test("returns an empty array when there are no calls", () => {
  const php = `echo "hello world";`;

  const calls = findIncludeComponentCalls(php);

  assert.equal(calls.length, 0);
});

test("allows hyphens in vendor namespaces", () => {
  const php = `IncludeComponent("my-company:catalog", "", []);`;

  const [call] = findIncludeComponentCalls(php);

  assert.equal(call.component.namespace, "my-company");
  assert.equal(call.component.name, "catalog");
});

test("handles single-quoted calls", () => {
  const php = `IncludeComponent('bitrix:catalog', 'catalog', []);`;

  const [call] = findIncludeComponentCalls(php);

  assert.equal(call.component.namespace, "bitrix");
  assert.equal(call.component.name, "catalog");
  assert.equal(call.template.templateName, "catalog");
});

test("handles mixed quote styles between the two arguments", () => {
  const php = `IncludeComponent("bitrix:catalog", 'catalog', []);`;

  const [call] = findIncludeComponentCalls(php);

  assert.equal(call.component.name, "catalog");
  assert.equal(call.template.templateName, "catalog");
});
