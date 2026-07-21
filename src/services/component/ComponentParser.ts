import { IncludeComponentCall } from "../../core/types/component";

// Captures: 1=component quote char, 2=namespace, 3=component name,
// 4=template quote char, 5=template name (may be empty).
// The template-name charset is deliberately restricted the same way as
// namespace/name (not ".*?") — this is a directory segment that later gets
// passed straight to path.join in TemplateResolver, so it must not be able
// to smuggle "/", "\", or ".." sequences into a path-traversal payload.
// The "d" flag exposes per-group character offsets via match.indices,
// so ranges for the two clickable spans (component id, template name)
// don't have to be recomputed by hand.
const INCLUDE_COMPONENT_RE =
  /IncludeComponent\s*\(\s*(["'])([A-Za-z0-9_.-]+):([A-Za-z0-9_.-]+)\1\s*,\s*(["'])([A-Za-z0-9_.-]*)\4/gd;

export function findIncludeComponentCalls(text: string): IncludeComponentCall[] {
  const calls: IncludeComponentCall[] = [];
  const re = new RegExp(INCLUDE_COMPONENT_RE);
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const indices = match.indices;
    if (!indices) {
      continue;
    }

    const [, , namespace, name, , templateName] = match;
    const [namespaceStart] = indices[2]!;
    const [, nameEnd] = indices[3]!;
    const [templateQuoteStart] = indices[4]!;
    const [templateContentStart, templateContentEnd] = indices[5]!;

    // An empty template literal ("") has a zero-width content range, which
    // would produce an unclickable document link (nothing for the editor
    // to underline). Anchor to the quote pair itself in that case instead.
    const isEmptyTemplate = templateContentStart === templateContentEnd;
    const templateStart = isEmptyTemplate ? templateQuoteStart : templateContentStart;
    const templateEnd = isEmptyTemplate ? templateContentEnd + 1 : templateContentEnd;

    calls.push({
      component: {
        namespace,
        name,
        start: namespaceStart,
        end: nameEnd,
      },
      template: {
        namespace,
        name,
        templateName,
        start: templateStart,
        end: templateEnd,
      },
    });
  }

  return calls;
}
