import type { Href } from "expo-router";
export type Link =
  | { label: string; route: Href; category?: string }
  | { label: string; site: string };
export const groups: [string, Link[]][] = [
  [
    "Visão geral",
    [
      { label: "Início", route: "/home" },
      { label: "Dashboard", route: "/dashboard" },
    ],
  ],
  [
    "Catálogo",
    ["Peças", "Filamentos", "Impressoras", "Embalagens"].map((label, i) => ({
      label,
      route: "/catalog",
      category: ["pecas", "filamentos", "impressoras", "embalagens"][i],
    })),
  ],
  [
    "Cálculos",
    [
      { label: "Calcular", route: "/calculate" },
      {
        label: "Meus cálculos",
        route: { pathname: "/calculate", params: { modo: "historico" } },
      },
    ],
  ],
  [
    "Comercial",
    [
      { label: "Clientes", route: "/customers" },
      { label: "Orçamentos e pedidos", site: "/orcamentos" },
      { label: "Vendas e estoque", route: "/sales" },
      { label: "Outras vendas", site: "/outras-vendas" },
    ],
  ],
  ["Produção", [{ label: "Planejar produção", site: "/simulacao" }]],
  [
    "Gestão",
    [
      { label: "Movimentações", route: "/movements" },
      { label: "Custos extras", route: "/extra-costs" },
      { label: "Mais", route: "/more" },
    ],
  ],
];
