import { AccountBadge } from "@/components/account-badge";
import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/auth/provider";
import { type Link } from "@/features/menu-groups";
import { openWebsite } from "@/features/website";
import { ModuleScreen } from "@/components/module-screen";
import { MenuCard } from "@/components/menu-card";
import type { IconName } from "@/components/icon";
import { useTheme } from "@/theme/provider";
import { Body, Notice } from "@/components/ui";
type MenuItem = Link & { icon: IconName };
const account: MenuItem = {
  label: "Minha conta",
  route: "/account",
  icon: "person",
};
const sections: [string, MenuItem[]][] = [
  [
    "Visão geral",
    [{ label: "Dashboard", route: "/dashboard", icon: "bar-chart" }],
  ],
  [
    "Comercial",
    [
      { label: "Clientes", route: "/customers", icon: "person" },
      { label: "Orçamentos e pedidos", site: "/orcamentos", icon: "file-text" },
      { label: "Outras vendas", site: "/outras-vendas", icon: "bag-plus" },
    ],
  ],
  [
    "Produção e gestão",
    [
      { label: "Planejar produção", site: "/simulacao", icon: "calendar3" },
      { label: "Movimentações", route: "/movements", icon: "arrow-switch" },
      { label: "Custos extras", site: "/custos-loja", icon: "cash-coin" },
    ],
  ],
  [
    "Conta",
    [account, { label: "Configurações", route: "/settings", icon: "gear" }],
  ],
];
export default function More() {
  const theme = useTheme();
  const auth = useAuth(),
    [error, setError] = useState("");
  const visible: [string, MenuItem[]][] = auth.account?.tenantId
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
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <AccountBadge />
        <Body strong>{auth.account?.email}</Body>
      </View>
      {visible.map(([name, entries]) => (
        <View key={name} style={{ gap: 8, marginTop: 8 }}>
          <Body strong>{name}</Body>
          <View
            style={{
              borderWidth: 1,
              borderColor: theme.border,
              borderRadius: 14,
              backgroundColor: theme.surface,
              paddingHorizontal: 5,
              overflow: "hidden",
            }}
          >
            {entries.map((item, index) => (
              <View
                key={item.label}
                style={{
                  borderTopWidth: index ? 1 : 0,
                  borderColor: theme.border,
                }}
              >
                <MenuCard
                  grouped
                  label={item.label}
                  icon={item.icon}
                  onPress={() => open(item)}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
      {!!error && <Notice message={error} />}
    </ModuleScreen>
  );
}
