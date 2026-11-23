import assert from "node:assert/strict";
import test from "node:test";
import {
  calculationFilaments,
  referencedMaterials,
} from "../src/features/calculation-materials.ts";
test("dez filamentos usados conservam a ordem, a cor e o consumo de cada um", () => {
  const refs = Array.from({ length: 10 }, (_, i) => ({
    material: "PLA",
    corHex: "#" + (i + 100).toString(16).padStart(6, "0"),
    pesoGramas: i + 0.25,
  }));
  const rows = referencedMaterials([...refs, { pesoGramas: 0 }], "500");
  assert.deepEqual(
    rows,
    refs.map((m, key) => ({
      key,
      grams: String(m.pesoGramas),
      color: m.corHex,
      name: m.material,
    })),
  );
});
test("peça antiga sem detalhamento abre com o consumo cadastrado", () =>
  assert.deepEqual(referencedMaterials(undefined, "41"), [
    { key: 0, grams: "41" },
  ]));

test("duas referências ao mesmo rolo somam os gramas das cópias do arquivo", () => {
  assert.deepEqual(
    calculationFilaments(
      [
        { id: "a", grams: 2.5 },
        { id: "b", grams: 1 },
        { id: "a", grams: 3 },
      ],
      2,
    ),
    [
      { filamentoId: "a", quantidadeFilamentoGramas: 11 },
      { filamentoId: "b", quantidadeFilamentoGramas: 2 },
    ],
  );
});
