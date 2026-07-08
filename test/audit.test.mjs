/**
 * Automates the red-team check: runAudit must pass a clean fixture project
 * and must catch a deliberately broken one, rule by rule. This freezes the
 * manual "inject a violation and see if it's caught" test into CI forever.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAudit } from "../scripts/audit-tokens.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

const fixtureConfig = (name) => ({
  tokensDir: path.join(here, "fixtures", name, "tokens"),
  generatedCss: path.join(here, "fixtures", name, "styles/tokens.css"),
  componentsDir: path.join(here, "fixtures", name, "components"),
  appPaths: [],
  colorMathLib: path.join(here, "..", "src/lib/color-math.js"),
});

test("audit: clean fixture reports zero violations", async () => {
  const { violations, stats } = await runAudit(fixtureConfig("good"));
  assert.deepEqual(
    violations,
    [],
    `expected no violations, got:\n${JSON.stringify(violations, null, 2)}`,
  );
  assert.equal(stats.components, 1);
});

test("audit: broken fixture fires every rule at least once", async () => {
  const { violations } = await runAudit(fixtureConfig("bad"));
  const fired = new Set(violations.map((v) => v.rule));
  for (const rule of ["T1", "T3", "T4", "C1", "C2", "C3", "C4", "C5", "M1", "P1"]) {
    assert.ok(fired.has(rule), `expected rule ${rule} to fire`);
  }
});

test("audit: each violation names its file and carries a message", async () => {
  const { violations } = await runAudit(fixtureConfig("bad"));
  assert.ok(violations.length > 0);
  for (const v of violations) {
    assert.ok(v.file && v.file.length > 0, "violation has a file");
    assert.ok(v.message && v.message.length > 0, "violation has a message");
  }
});

test("audit: the real project passes (invariants currently hold)", async () => {
  const config = (await import("../scripts/ds.config.mjs")).default;
  const cwd = process.cwd();
  process.chdir(path.join(here, ".."));
  try {
    const { violations } = await runAudit(config);
    assert.deepEqual(
      violations,
      [],
      `real project has violations:\n${JSON.stringify(violations, null, 2)}`,
    );
  } finally {
    process.chdir(cwd);
  }
});
