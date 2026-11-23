import type { CatalogRow } from "@/components/catalog-card";
export function referencedMaterials(
  refs: CatalogRow["materiais"],
  fallback: string,
) {
  const used = (refs ?? []).filter((m) => (m.pesoGramas ?? 0) > 0);
  return used.length
    ? used.map((m, key) => ({
        key,
        grams: String(m.pesoGramas),
        color: m.corHex,
        name: m.material,
      }))
    : [{ key: 0, grams: fallback }];
}

export function calculationFilaments(
  rows: { id?: string; grams: number }[],
  copies: number,
) {
  const totals = new Map<string, number>();
  for (const row of rows) {
    if (row.id)
      totals.set(row.id, (totals.get(row.id) ?? 0) + row.grams * copies);
  }
  return Array.from(totals, ([filamentoId, grams]) => ({
    filamentoId,
    quantidadeFilamentoGramas: Number(grams.toFixed(6)),
  }));
}
