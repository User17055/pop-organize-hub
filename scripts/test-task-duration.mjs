import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/lib/task-duration.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext },
}).outputText;
const { parseTaskDuration, formatTaskDuration } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`
);

test("duration labels round-trip across clients", () => {
  for (const minutes of [1, 15, 45, 60, 90, 120, 1440])
    assert.equal(parseTaskDuration(formatTaskDuration(minutes)), minutes);
  assert.equal(parseTaskDuration("1 hora 30 minutos"), 90);
  assert.equal(parseTaskDuration("90"), 90);
});
test("invalid or cleared durations are not stored", () => {
  for (const value of ["", "Sem duração", "0 min", "-5 min", "25 h", "banana 30 min", "1.5 h"])
    assert.equal(parseTaskDuration(value), undefined);
});
