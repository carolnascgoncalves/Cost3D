import type { CatalogRow } from "@/components/catalog-card";
export function pieceCalculation(row: CatalogRow) {
  return {
    pathname: "/calculate" as const,
    params: {
      modo: "salvar",
      peca: row.id ?? "",
      nome: row.nome ?? "",
      materiais: JSON.stringify(row.materiais ?? []),
      gramas: row.gramas ?? "",
      minutos: String(row.minutos ?? ""),
    },
  };
}
