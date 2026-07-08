/**
 * rehype-figure rewrites markdown image patterns into figure/figcaption.
 * Both authoring variants must be covered, and non-matching content must be
 * left untouched — a greedy transform would silently eat real paragraphs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import rehypeFigure from "../src/lib/rehype-figure.mjs";

const text = (value) => ({ type: "text", value });
const el = (tagName, children = []) => ({
  type: "element",
  tagName,
  properties: {},
  children,
});
const para = (...children) => el("p", children);
const img = () => el("img");
const em = (value) => el("em", [text(value)]);

/** Runs the plugin on a root with the given children, returns new children. */
function transform(children) {
  const tree = { type: "root", children };
  rehypeFigure()(tree);
  return tree.children;
}

test("inline caption: image and *em* in one paragraph become a figure", () => {
  const out = transform([para(img(), em("A caption"))]);
  assert.equal(out.length, 1);
  assert.equal(out[0].tagName, "figure");
  assert.deepEqual(
    out[0].children.map((c) => c.tagName),
    ["img", "figcaption"],
  );
  assert.equal(out[0].children[1].children[0].value, "A caption");
});

test("separate caption: image paragraph then *em* paragraph merge", () => {
  const out = transform([para(img()), text("\n"), para(em("Next-line caption"))]);
  assert.equal(out.length, 1);
  assert.equal(out[0].tagName, "figure");
  assert.deepEqual(
    out[0].children.map((c) => c.tagName),
    ["img", "figcaption"],
  );
});

test("image without caption still becomes a bare figure", () => {
  const out = transform([para(img())]);
  assert.equal(out.length, 1);
  assert.equal(out[0].tagName, "figure");
  assert.deepEqual(
    out[0].children.map((c) => c.tagName),
    ["img"],
  );
});

test("a following non-em paragraph is NOT consumed as a caption", () => {
  const out = transform([para(img()), para(text("Ordinary body text."))]);
  assert.equal(out.length, 2);
  assert.equal(out[0].tagName, "figure");
  assert.equal(out[1].tagName, "p");
  assert.equal(out[1].children[0].value, "Ordinary body text.");
});

test("an *em*-only paragraph after a heading stays a paragraph", () => {
  const out = transform([el("h2", [text("Heading")]), para(em("emphasis"))]);
  assert.equal(out.length, 2);
  assert.equal(out[1].tagName, "p");
});

test("prose without images passes through unchanged", () => {
  const input = [para(text("Just text.")), el("h2", [text("Title")])];
  const out = transform(input);
  assert.equal(out.length, 2);
  assert.equal(out[0].tagName, "p");
  assert.equal(out[1].tagName, "h2");
});
