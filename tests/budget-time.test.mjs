import assert from "node:assert/strict";
import test from "node:test";
import { formatHourInput } from "../src/features/budget-time.ts";

test("formata durante a digitação e permite continuar e apagar", () => {
  const type = (digits) => {
    let field = { display: "", value: "" };
    return Array.from(digits, (digit) => {
      field = formatHourInput(field.display + digit, field.display);
      return field.display;
    });
  };
  assert.deepEqual(type("700"), ["7", "7:0", "07:00"]);
  assert.deepEqual(type("0700"), ["0", "07", "07:0", "07:00"]);
  assert.equal(type("1830").at(-1), "18:30");
  assert.equal(formatHourInput("18:3", "18:30").value, "");
  assert.equal(formatHourInput("25:90", null).value, "");
});
