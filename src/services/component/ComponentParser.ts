import { ComponentReference } from "../../core/types/component";

const INCLUDE_COMPONENT_RE =
  /IncludeComponent\s*\(\s*(["'])([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+)\1/g;

export function findComponentReferences(text: string): ComponentReference[] {
  const references: ComponentReference[] = [];
  const re = new RegExp(INCLUDE_COMPONENT_RE);
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const [full, quote, namespace, name] = match;
    const idInQuotes = `${namespace}:${name}`;
    const start = match.index + full.indexOf(quote) + 1;
    const end = start + idInQuotes.length;
    references.push({ namespace, name, start, end });
  }

  return references;
}
