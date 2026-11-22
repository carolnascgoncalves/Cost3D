import { ActivityIndicator } from "react-native";
import { ModuleScreen, MenuRows } from "@/components/module-screen";
import { Body, Card, Notice } from "@/components/ui";
import { useAuth } from "@/auth/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { quantity } from "@/features/format";
import type { components } from "@/api/schema";
export default function Home() {
  const { account } = useAuth();
  const q = useApiQuery<components["schemas"]["InicioLoja"]>(
    account?.tenantId ? "/inicio" : null,
  );
  const low = q.data?.estoqueCritico;
  return (
    <ModuleScreen section="Painel principal" title="Boas-vindas ao Cost3D!">
      {!account?.tenantId ? (
        <MenuRows entries={[{ label: "Minha conta", route: "/account" }]} />
      ) : q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          <Card>
            <Body muted>Continue de onde parou</Body>
            <Body>Seus últimos cálculos</Body>
            {q.data?.recentes?.length ? (
              q.data.recentes.map((r) => (
                <Body key={r.id}>
                  {r.nome} · {r.situacao}
                </Body>
              ))
            ) : (
              <Body muted>Nenhum cálculo salvo ainda.</Body>
            )}
          </Card>
          <Body>Precisa de atenção</Body>
          {low && (
            <Card>
              <Body>
                {low.nome} {low.cor} acabando
              </Body>
              <Body muted>{quantity(low.estoque, "g")} restantes</Body>
            </Card>
          )}
          {!!q.data?.aguardandoVenda && (
            <Card>
              <Body>{q.data.aguardandoVenda} un. aguardando venda</Body>
              <Body muted>Peças produzidas em estoque</Body>
            </Card>
          )}
          {!low && !q.data?.aguardandoVenda && (
            <Card>
              <Body muted>Nenhum alerta de estoque.</Body>
            </Card>
          )}
          <MenuRows
            entries={[{ label: "Abrir dashboard", route: "/dashboard" }]}
          />
        </>
      )}
    </ModuleScreen>
  );
}
