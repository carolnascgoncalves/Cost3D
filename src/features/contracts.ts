import type { components } from "@/api/schema";
export type Customer = components["schemas"]["Cliente"];
export type CustomerList = components["schemas"]["Listagem"];
export type CustomerRow = components["schemas"]["ClienteResumo"];
export type CustomerInput = components["schemas"]["Entrada"];
export type Movement = components["schemas"]["MovimentacaoResponse"];
export type Statement = components["schemas"]["Extrato"];
export const movementTypes = [
  ["", "Todos"],
  ["COMPRA", "Compras"],
  ["PRODUCAO", "Produção"],
  ["VENDA_3D", "Vendas 3D"],
  ["VENDA_PRODUTO", "Produtos"],
  ["AJUSTE", "Ajustes"],
  ["PERDA", "Perdas"],
  ["DESFAZER_PRODUCAO", "Produção desfeita"],
  ["CANCELAR_VENDA_3D", "Vendas 3D canceladas"],
  ["CANCELAR_VENDA_PRODUTO", "Produtos cancelados"],
  ["CANCELAR_PERDA", "Perdas canceladas"],
  ["SALDO_INICIAL", "Saldo inicial"],
  ["OUTRO", "Outros"],
] as const;
export const movementLabels: Record<string, string> = {
  SALDO_INICIAL: "Saldo de abertura",
  COMPRA: "Compra",
  AJUSTE: "Ajuste",
  PRODUCAO: "Produção",
  DESFAZER_PRODUCAO: "Produção desfeita",
  PERDA: "Perda",
  CANCELAR_PERDA: "Perda cancelada",
  VENDA_3D: "Venda",
  CANCELAR_VENDA_3D: "Venda cancelada",
  VENDA_PRODUTO: "Venda de produto",
  CANCELAR_VENDA_PRODUTO: "Venda cancelada",
  OUTRO: "Movimentação",
};
