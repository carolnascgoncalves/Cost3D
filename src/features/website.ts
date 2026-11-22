import { Linking } from "react-native";
import { apiUrl } from "@/api/session";
export function websiteUrl(path: string) {
  const base = process.env.EXPO_PUBLIC_SITE_URL || apiUrl;
  const url = new URL(base);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Configure um endereço HTTP ou HTTPS válido para o site.");
  if (!path.startsWith("/") || path.startsWith("//"))
    throw new Error("Caminho de página inválido.");
  return new URL(path, url.origin).toString();
}
export async function openWebsite(path: string) {
  await Linking.openURL(websiteUrl(path));
}
export const websiteModules = [
  {
    title: "Produção",
    items: [
      {
        title: "Calcular peça",
        description: "Materiais, impressão, embalagem e preço de venda.",
        path: "/historico/novo",
      },
      {
        title: "Cadastro rápido",
        description: "Importe arquivos 3MF e organize seus lotes.",
        path: "/calculo-rapido",
      },
      {
        title: "Histórico de cálculos",
        description: "Consulte os preços e cálculos que já foram salvos.",
        path: "/historico/listar",
      },
      {
        title: "Planejar produção",
        description: "Distribua a produção entre suas impressoras.",
        path: "/simulacao",
      },
    ],
  },
  {
    title: "Catálogo",
    items: [
      {
        title: "Peças",
        description: "Modelos e arquivos da sua loja.",
        path: "/peca/listar",
      },
      {
        title: "Filamentos",
        description: "Materiais, cores, compras e estoque.",
        path: "/filamento/listar",
      },
      {
        title: "Impressoras",
        description: "Equipamentos e manutenções.",
        path: "/impressora/listar",
      },
      {
        title: "Embalagens",
        description: "Embalagens e seus custos.",
        path: "/embalagem/listar",
      },
    ],
  },
  {
    title: "Vendas e gestão",
    items: [
      {
        title: "Orçamentos",
        description: "Propostas, clientes e pedidos da loja.",
        path: "/orcamentos",
      },
      {
        title: "Vendas e estoque",
        description: "Lotes produzidos, peças prontas e vendas.",
        path: "/vendas-estoque",
      },
      {
        title: "Outras vendas",
        description: "Produtos e vendas avulsas.",
        path: "/outras-vendas",
      },
      {
        title: "Custos da loja",
        description: "Acompanhe os custos que entram no seu preço.",
        path: "/custos-loja",
      },
      {
        title: "Configurações",
        description: "Preferências e valores usados nos cálculos.",
        path: "/configuracao",
      },
    ],
  },
];
