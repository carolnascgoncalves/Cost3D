import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/provider";
import { groups, type Link } from "@/features/menu-groups";
import { openWebsite } from "@/features/website";
import { ModuleScreen } from "@/components/module-screen";
import { MenuCard } from "@/components/menu-card";
import type { IconName } from "@/components/icon";
import { Body, Notice } from "@/components/ui";
const icons: Record<string, IconName> = {
  Início: "house",
  Dashboard: "collection",
  Peças: "box",
  Filamentos: "palette",
  Impressoras: "printer",
  Embalagens: "box",
  Calcular: "calculator",
  "Meus cálculos": "clock-history",
  Clientes: "collection",
  "Orçamentos e pedidos": "pencil",
  "Vendas e estoque": "shop",
  "Outras vendas": "bag-plus",
  "Planejar produção": "calendar3",
  Movimentações: "arrow-repeat",
  "Custos extras": "cash-coin",
  Configurações: "calculator",
  "Minha conta": "house",
};
const account: Link = { label: "Minha conta", route: "/account" };
const sections: [string, Link[]][] = groups.map(([name, items]) => [
  name,
  name === "Gestão"
    ? [
        ...items.filter((i) => i.label !== "Mais"),
        { label: "Configurações", site: "/configuracao" },
        account,
      ]
    : items,
]);
export default function More() {
  const auth = useAuth(),
    [error, setError] = useState("");
  const visible: [string, Link[]][] = auth.account?.tenantId
    ? sections
    : [["Conta", [account]]];
  function open(item: Link) {
    setError("");
    if ("site" in item)
      void openWebsite(item.site).catch(() =>
        setError("Não foi possível abrir o site."),
      );
    else if (item.category)
      router.push({
        pathname: "/catalog",
        params: { categoria: item.category },
      });
    else router.push(item.route);
  }
  return (
    <ModuleScreen lightHeader section="Menu" title="Mais">
      {visible.map(([name, entries]) => (
        <View key={name} style={{ gap: 8, marginTop: 8 }}>
          <Body strong>{name}</Body>
          {entries.map((item) => (
            <MenuCard
              key={item.label}
              label={item.label}
              icon={icons[item.label]}
              onPress={() => open(item)}
            />
          ))}
        </View>
      ))}
      {!!error && <Notice message={error} />}
    </ModuleScreen>
  );
}
