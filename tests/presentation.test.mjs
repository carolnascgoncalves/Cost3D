import { test } from "node:test";
import assert from "node:assert/strict";
import { contrast, createTheme, readable } from "../src/theme/colors.ts";
import {
  decimal,
  reais,
  quantity,
  toIsoDate,
  productionDescription,
  dateTime,
} from "../src/features/format.ts";

test("tenant colors propagate and invalid colors fall back to Cost3D", () => {
  const blue = createTheme({
    corPrimaria: "#185ABD",
    corDestaque: "#FFE966",
    corFundo: "#F5F9FF",
  });
  assert.equal(blue.primary, "#185ABD");
  assert.equal(blue.accent, "#FFE966");
  assert.equal(blue.background, "#F5F9FF");
  assert.equal(createTheme({ corPrimaria: "url(evil)" }).primary, "#86202D");
});
test("button text meets 4.5 contrast on light, dark and middle gray backgrounds", () => {
  for (let value = 0; value <= 255; value++) {
    const hex = "#" + value.toString(16).padStart(2, "0").repeat(3);
    assert.ok(contrast(hex, readable(hex)) >= 4.5, hex);
  }
  for (const primary of [
    "#FFFF00",
    "#185ABD",
    "#FF00FF",
    "#00FF00",
    "#86202D",
  ]) {
    const theme = createTheme({ corPrimaria: primary, corDestaque: primary });
    assert.ok(contrast(primary, theme.onPrimary) >= 4.5);
    assert.ok(contrast(primary, theme.onAccent) >= 4.5);
  }
});
test("surface text stays readable for dark tenant backgrounds", () => {
  const theme = createTheme({ corFundo: "#101010", corPrimaria: "#FFF" });
  assert.ok(contrast(theme.text, theme.surface) >= 4.5);
  assert.ok(contrast(theme.pageText, theme.background) >= 4.5);
});
test("decimal formatting preserves values beyond floating point precision and rounds half-up", () => {
  assert.equal(
    decimal("12345678901234567890.123456", 6),
    "12.345.678.901.234.567.890,123456",
  );
  assert.equal(decimal("999.9995"), "1.000");
  assert.equal(decimal("-0.0001", 1), "0");
});
test("budget totals retain cents and decimal precision", () => {
  assert.equal(reais("9007199254740993.10"), "R$ 9.007.199.254.740.993,10");
  assert.equal(reais("0"), "R$ 0,00");
});
test("filament quantities use kg or g; unit sales keep un.", () => {
  assert.equal(quantity("-5415.300", "g", true), "-5,42 kg");
  assert.equal(quantity("86.35", "g", true), "+86,4 g");
  assert.equal(quantity("-2", "un.", true), "-2 un.");
  assert.equal(
    quantity("1000000000000000000000", "g"),
    "1.000.000.000.000.000.000 kg",
  );
});
test("dates validate leap years and reject impossible days", () => {
  assert.equal(toIsoDate("29/02/2024"), "2024-02-29");
  assert.equal(toIsoDate("29/02/2026"), null);
  assert.equal(toIsoDate("31/04/2026"), null);
  assert.equal(toIsoDate("2026-11-17"), "2026-11-17");
  assert.equal(toIsoDate(""), "");
});
test("production displays material title separately from the printed piece", () => {
  assert.deepEqual(productionDescription("PLA · Amarelo — T-Rex", "PRODUCAO"), {
    title: "PLA · Amarelo",
    detail: "T-Rex",
  });
  assert.deepEqual(productionDescription("Kit - LED", "VENDA_PRODUTO"), {
    title: "Kit - LED",
    detail: "",
  });
});
test("movement dates use the shop timezone", () => {
  assert.match(dateTime("2026-11-18T01:21:00Z"), /17\/11\/2026.*22:21/);
});
