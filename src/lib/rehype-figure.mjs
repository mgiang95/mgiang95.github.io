/**
 * rehype-figure — converts the markdown authoring pattern
 *
 *   ![alt](./image.jpg)
 *   *A caption sentence*
 *
 * into real <figure> + <figcaption> semantics. Both authoring variants are
 * covered: caption on the next line (image and emphasis share one paragraph)
 * and caption after a blank line (two adjacent paragraphs). Styling comes
 * from the figure.* component tokens via the .prose figure rules in
 * global.css — the same contract the Figure component uses.
 */

/** True for hast text nodes that are only whitespace. */
const isBlank = (node) => node.type === "text" && !node.value.trim();

/** Non-whitespace children of a paragraph, or null for non-paragraphs. */
function paragraphContent(node) {
  if (node?.type !== "element" || node.tagName !== "p") return null;
  return node.children.filter((child) => !isBlank(child));
}

const isTag = (node, tagName) =>
  node?.type === "element" && node.tagName === tagName;

const figcaption = (children) => ({
  type: "element",
  tagName: "figcaption",
  properties: {},
  children,
});

const figure = (children) => ({
  type: "element",
  tagName: "figure",
  properties: {},
  children,
});

export default function rehypeFigure() {
  return function transform(tree) {
    if (!tree.children) return;
    for (const child of tree.children) transform(child);

    const out = [];
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      const content = paragraphContent(node);
      if (!content || !isTag(content[0], "img")) {
        out.push(node);
        continue;
      }

      // Variant 1: image and *caption* share one paragraph (soft break).
      if (content.length === 2 && isTag(content[1], "em")) {
        out.push(figure([content[0], figcaption(content[1].children)]));
        continue;
      }
      if (content.length !== 1) {
        out.push(node);
        continue;
      }

      // Variant 2: image-only paragraph; look past whitespace for an
      // *emphasis*-only caption paragraph.
      let j = i + 1;
      while (j < tree.children.length && isBlank(tree.children[j])) j++;
      const next = paragraphContent(tree.children[j]);
      if (next?.length === 1 && isTag(next[0], "em")) {
        out.push(figure([content[0], figcaption(next[0].children)]));
        i = j; // consume the caption paragraph
      } else {
        out.push(figure([content[0]]));
      }
    }
    tree.children = out;
  };
}
