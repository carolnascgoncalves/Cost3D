import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  barRange,
  overlaps,
  lastDay,
  dayNumber,
} from "../src/features/planning-dates.ts";
test("uma impressão que termina à meia-noite ocupa apenas os dias anteriores", () => {
  const job = { inicio: "2026-11-23T08:00:00", fim: "2026-11-26T00:00:00.000" };
  assert.ok(overlaps(job, "2026-11-25"));
  assert.equal(overlaps(job, "2026-11-26"), false);
  assert.equal(lastDay(job), "2026-11-25");
  assert.equal(dayNumber(lastDay(job)) - dayNumber(job.inicio) + 1, 3);
});
test("a barra respeita os limites da semana e a posição dos horários", () => {
  const start = "2026-12-29";
  assert.equal(addDays(start, 7), "2027-01-05");
  assert.deepEqual(
    barRange(
      { inicio: "2026-12-28T12:00:00", fim: "2027-01-07T10:00:00" },
      start,
    ),
    { left: 0, right: 1 },
  );
  assert.equal(
    barRange(
      { inicio: "2026-12-29T12:00:00", fim: "2026-12-30T00:00:00" },
      start,
    ).left,
    0.5 / 7,
  );
});
