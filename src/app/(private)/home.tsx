import { router } from "expo-router";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import { ModuleScreen, MenuRows } from "@/components/module-screen";
import { Badge, Body, Button, Card, Notice } from "@/components/ui";
import { useAuth } from "@/auth/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { useStoreName } from "@/theme/provider";
import { quantity } from "@/features/format";
import type { components } from "@/api/schema";
export default function Home() {
  const { account } = useAuth();
  const q = useApiQuery<components["schemas"]["InicioLoja"]>(
    account?.tenantId ? "/inicio" : null,
  );
  const mobile = useWindowDimensions().width < 900;
  const name = useStoreName();
  const low = q.data?.estoqueCritico;
  return (
    <ModuleScreen
      section="Painel principal"
      title={"Boas-vindas ao " + (mobile ? name : "Cost3D") + "!"}
    >
      {!account?.tenantId ? (
        <MenuRows entries={[{ label: "Minha conta", route: "/account" }]} />
      ) : q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          <Card>
            <Body strong={mobile} muted={!mobile}>
              Continue de onde parou
            </Body>
            <Body muted={mobile}>Seus últimos cálculos</Body>
            {q.data?.recentes?.length ? (
              q.data.recentes.map((r) =>
                mobile ? (
                  <View
                    key={r.id}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Body>{r.nome}</Body>
                    </View>
                    {!!r.situacao && <Badge>{r.situacao}</Badge>}
                  </View>
                ) : (
                  <Body key={r.id}>
                    {r.nome} · {r.situacao}
                  </Body>
                ),
              )
            ) : (
              <Body muted>Nenhum cálculo salvo ainda.</Body>
            )}
          </Card>
          <Body strong={mobile}>Precisa de atenção</Body>
          {low && (
            <Card>
              <Body strong={mobile}>
                {low.nome} {low.cor} acabando
              </Body>
              <Body muted>{quantity(low.estoque, "g")} restantes</Body>
            </Card>
          )}
          {!!q.data?.aguardandoVenda && (
            <Card>
              <Body strong={mobile}>
                {q.data.aguardandoVenda} un. aguardando venda
              </Body>
              <Body muted>Peças produzidas em estoque</Body>
            </Card>
          )}
          {!low && !q.data?.aguardandoVenda && (
            <Card>
              <Body muted>Nenhum alerta de estoque.</Body>
            </Card>
          )}
          {mobile ? (
            <Button
              label="Abrir dashboard"
              onPress={() => router.push("/dashboard")}
            />
          ) : (
            <MenuRows
              entries={[{ label: "Abrir dashboard", route: "/dashboard" }]}
            />
          )}
        </>
      )}
    </ModuleScreen>
  );
}
