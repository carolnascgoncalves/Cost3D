import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { MenuRows, ModuleScreen } from "@/components/module-screen";
import { Body, Card, Chip, Notice, Pagination, layout } from "@/components/ui";
import { useApiQuery } from "@/hooks/use-api-query";
import type { components } from "@/api/schema";
import { reais } from "@/features/format";
const groups = [
  ["ESTOQUE", "Em estoque"],
  ["PARA_PRODUZIR", "Para produzir"],
  ["VENDIDOS", "Vendidas"],
] as const;
export default function Sales() {
  const [group, setGroup] = useState<string>("ESTOQUE");
  const [page, setPage] = useState(0);
  const q = useApiQuery<components["schemas"]["PaginaResponseLoteResumo"]>(
    `/vendas?grupo=${group}&pagina=${page}`,
  );
  return (
    <ModuleScreen section="Comercial" title="Vendas e estoque">
      <View style={layout.row}>
        {groups.map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={group === key}
            onPress={() => {
              setPage(0);
              setGroup(key);
            }}
          />
        ))}
      </View>
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          {!q.data?.itens?.length && (
            <Card>
              <Body muted>Nenhum lote nesta lista.</Body>
            </Card>
          )}
          {q.data?.itens?.map((l) => (
            <Card key={l.id}>
              <Body>{l.nome}</Body>
              <Body muted>
                {group === "ESTOQUE"
                  ? `Em estoque · ${(l.unidades ?? 0) - (l.vendidas ?? 0)} un.`
                  : group === "VENDIDOS"
                    ? `Vendidas · ${l.vendidas ?? l.unidades} un.`
                    : `Para produzir · ${l.unidades} un.`}
              </Body>
              {group === "ESTOQUE" && (
                <Body muted>Disponível · {l.disponiveis} un.</Body>
              )}
              <Body>Preço unitário · {reais(l.preco)}</Body>
              {l.id && (
                <MenuRows
                  entries={[
                    {
                      label: "Detalhes do lote",
                      site: `/vendas-estoque/lote/${encodeURIComponent(l.id)}`,
                    },
                  ]}
                />
              )}
            </Card>
          ))}
          {(q.data?.total ?? 0) > (q.data?.tamanho ?? 12) && (
            <Pagination
              page={page}
              onPage={setPage}
              total={q.data?.total ?? 0}
              size={q.data?.tamanho}
            />
          )}
        </>
      )}
    </ModuleScreen>
  );
}
