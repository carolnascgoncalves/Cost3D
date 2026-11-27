import { router } from "expo-router";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { ModuleScreen, MenuRows } from "@/components/module-screen";
import { Body, Card, Notice } from "@/components/ui";
import { useAuth } from "@/auth/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { useStoreName, useTheme } from "@/theme/provider";
import { quantity, reais } from "@/features/format";
import type { components } from "@/api/schema";

function Shortcut({ label, icon, onPress }: { label: string; icon: IconName; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ flexBasis: "48%", flexGrow: 1, opacity: pressed ? 0.72 : 1 })}>
      <Card style={{ minHeight: 52, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Icon name={icon} size={18} color={t.primaryText} />
        <Text style={{ color: t.text, fontSize: 14, fontWeight: "600", flex: 1 }}>{label}</Text>
      </Card>
    </Pressable>
  );
}

export default function Home() {
  const { account } = useAuth(), t = useTheme(), name = useStoreName();
  const wide = useWindowDimensions().width >= 900;
  const q = useApiQuery<components["schemas"]["InicioLoja"]>(account?.tenantId ? "/inicio" : null);
  const data = q.data, low = data?.estoqueCritico, count = data?.aguardandoVenda ?? 0;
  return (
    <ModuleScreen lightHeader section="Minha loja" title={name}>
      {!account?.tenantId ? <MenuRows entries={[{ label: "Minha conta", route: "/account" }]} /> : q.loading ? <ActivityIndicator color={t.primaryText} /> : q.error ? <Notice message={q.error} onRetry={q.retry} /> : (
        <>
          <Pressable accessibilityRole="link" onPress={() => router.push("/dashboard")} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}>
            <Card style={{ padding: 12, backgroundColor: t.accentTint, borderColor: t.accentTint, flexDirection: "row", alignItems: "center", gap: 12 }}>
              <View style={{ width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: t.primary }}>
                <Icon name="bar-chart" size={21} color={t.onPrimary} />
              </View>
              <View style={{ flex: 1, gap: 1 }}><Text style={{ color: t.primaryText, fontSize: 16, fontWeight: "700" }}>Dashboard</Text><Text style={{ color: t.primaryText, fontSize: 12 }}>Lucro, vendas e produção</Text></View>
              <Text style={{ color: t.primaryText, fontSize: 23 }}>›</Text>
            </Card>
          </Pressable>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <Shortcut label="Calcular peça" icon="calculator" onPress={() => router.push("/calculate")} />
            <Shortcut label="Novo orçamento" icon="file-text" onPress={() => router.push("/budgets")} />
            <Shortcut label="Registrar venda" icon="bag-plus" onPress={() => router.push("/sales")} />
            <Shortcut label="Registrar compra" icon="box" onPress={() => router.navigate({ pathname: "/catalog", params: { categoria: "filamentos" } })} />
          </View>

          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>Precisa de atenção</Text>
            {low || count > 0 ? <Card style={{ paddingVertical: 0, gap: 0 }}>
              {low && <Pressable accessibilityRole="link" onPress={() => router.navigate({ pathname: "/catalog", params: { categoria: "filamentos" } })} style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: count > 0 ? 1 : 0, borderColor: t.border, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: t.dangerBackground }}><Icon name="warning" size={17} color={t.danger} /></View>
                <View style={{ flex: 1 }}><Body strong>{"Filamento " + (low.cor || low.nome) + " acabando"}</Body><Body muted>{quantity(low.estoque, "g") + " restantes"}</Body></View>
                <Text style={{ color: t.primaryText, fontSize: 13, fontWeight: "600" }}>Repor</Text>
              </Pressable>}
              {count > 0 && <Pressable accessibilityRole="link" onPress={() => router.push("/sales")} style={({ pressed }) => ({ minHeight: 54, flexDirection: "row", alignItems: "center", gap: 10, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: t.accentTint }}><Icon name="box" size={17} color={t.primaryText} /></View>
                <View style={{ flex: 1 }}><Body strong>{count + (count === 1 ? " peça sem venda" : " peças sem venda")}</Body><Body muted>Produzidas e paradas</Body></View><Text style={{ color: t.muted, fontSize: 21 }}>›</Text>
              </Pressable>}
            </Card> : <Card><Body muted>Nenhuma pendência no momento.</Body></Card>}
            {data?.valorHoraConfigurado === false && <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/settings", params: { secao: "mao" } })}><Card style={{ flexDirection: "row", alignItems: "center", gap: 10 }}><Icon name="clock-history" color={t.primaryText} /><View style={{ flex: 1 }}><Body strong>Defina o valor da sua hora</Body><Body muted>Opcional · inclui mão de obra no cálculo</Body></View><Text style={{ color: t.muted, fontSize: 21 }}>›</Text></Card></Pressable>}
          </View>

          <View style={{ gap: 7 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text accessibilityRole="header" style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>Continue de onde parou</Text>
              <Pressable accessibilityRole="link" onPress={() => router.push({ pathname: "/calculate", params: { modo: "historico" } })}><Text style={{ color: t.primaryText, fontSize: 12, fontWeight: "600" }}>Ver histórico</Text></Pressable>
            </View>
            <Card style={{ paddingVertical: 0, gap: 0 }}>
              {data?.recentes?.length ? data.recentes.map((r, i) => {
                const sold = r.situacao === "Vendido", produced = r.situacao === "Produzido";
                const statusBg = sold ? "#E8F1FB" : produced ? "#E5F4E4" : t.accentTint;
                const statusFg = sold ? "#256ABF" : produced ? "#008300" : t.muted;
                return <Pressable key={r.id} accessibilityRole="link" disabled={!r.id} onPress={() => router.push({ pathname: "/calculate", params: { modo: "detalhe", id: r.id! } })} style={({ pressed }) => ({ minHeight: 58, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: i === data.recentes!.length - 1 ? 0 : 1, borderColor: t.border, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ flex: 1, gap: 1 }}><Body strong>{r.nome}{(r.unidades ?? 0) > 1 ? " · " + r.unidades + " un." : ""}</Body><Body muted>{"Custo/un. " + reais(r.custoUnitario)}</Body></View>
                  <View style={{ alignItems: "flex-end", gap: 2 }}><Body strong>{reais(r.precoSugerido)}</Body><Text style={{ color: statusFg, backgroundColor: statusBg, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, fontSize: 10 }}>{r.situacao === "Produzido" ? "Em estoque" : r.situacao === "Vendido" ? "Vendido" : "Só cálculo"}</Text></View>
                </Pressable>;
              }) : <Body muted>Nenhum cálculo salvo ainda.</Body>}
            </Card>
          </View>
        </>
      )}
    </ModuleScreen>
  );
}
