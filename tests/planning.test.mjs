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

test("impressoras livres ficam juntas após os trabalhos, inclusive quando há uma impressora arquivada na agenda", async () => {
  const { weekPrinters } = await import("../src/features/planning-dates.ts");
  const printer = (id) => ({ id, nome: id });
  const job = (id, impressoraId) => ({
    id,
    impressoraId,
    impressora: impressoraId,
  });
  const { active, idle } = weekPrinters({
    impressoras: ["A", "B", "C"].map(printer),
    trabalhos: [job("1", "B"), job("2", "D"), job("3", "B")],
  });
  assert.deepEqual(
    active.map((p) => [p.id, p.jobs.map((j) => j.id)]),
    [
      ["B", ["1", "3"]],
      ["D", ["2"]],
    ],
  );
  assert.deepEqual(
    idle.map((p) => p.id),
    ["A", "C"],
  );
});
