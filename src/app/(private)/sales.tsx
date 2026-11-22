import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { MenuRows, ModuleScreen, SiteButton } from "@/components/module-screen";
import {
  ValueRow,
  Badge,
  Body,
  Card,
  Chip,
  Notice,
  Pagination,
  layout,
} from "@/components/ui";
import { useApiQuery } from "@/hooks/use-api-query";
import type { components } from "@/api/schema";

import { reais } from "@/features/format";
const groups = [
  ["ESTOQUE", "Em estoque"],
  ["PARA_PRODUZIR", "Para produzir"],
  ["VENDIDOS", "Vendidas"],
] as const;
export default function Sales() {
  const mobile = useWindowDimensions().width < 900;
  const [selected, setSelected] =
    useState<components["schemas"]["LoteResumo"]>();
  const [group, setGroup] = useState<string>("ESTOQUE");
  const [page, setPage] = useState(0);
  const q = useApiQuery<components["schemas"]["PaginaResponseLoteResumo"]>(
    `/vendas?grupo=${group}&pagina=${page}`,
  );
  if (mobile && selected?.id) {
    const produced = selected.unidades ?? 1;
    const sold = selected.vendidas ?? 0;
    const stock = group === "PARA_PRODUZIR" ? 0 : Math.max(0, produced - sold);
    return (
      <ModuleScreen
        section="Vendas e estoque"
        title={"Lote " + selected.id.slice(0, 8)}
        onBack={() => setSelected(undefined)}
      >
        <Card>
          <Body strong>{selected.nome}</Body>
          <ValueRow
            label={group === "PARA_PRODUZIR" ? "Para produzir" : "Produzidas"}
            value={produced + " un."}
          />
          <ValueRow label="Vendidas" value={sold + " un."} />
          <ValueRow label="Em estoque" value={stock + " un."} />
          {selected.disponiveis != null && (
            <ValueRow
              label="Disponível"
              value={selected.disponiveis + " un."}
            />
          )}
          <ValueRow label="Preço unitário" value={reais(selected.preco)} />
        </Card>
        {group === "ESTOQUE" && selected.disponiveis != null && (
          <Card>
            <Body strong>Reservadas em pedidos</Body>
            <Body muted>
              {stock > selected.disponiveis
                ? stock - selected.disponiveis + " un. reservadas"
                : "Nenhuma reserva neste lote."}
            </Body>
          </Card>
        )}
        <SiteButton
          label="Gerenciar lote no site"
          site={"/vendas-estoque/lote/" + encodeURIComponent(selected.id)}
        />
      </ModuleScreen>
    );
  }
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
          {q.data?.itens?.map((l) =>
            mobile ? (
              <Pressable
                key={l.id}
                accessibilityRole="link"
                accessibilityHint="Ver detalhes do lote"
                disabled={!l.id}
                onPress={() => setSelected(l)}
              >
                <Card>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      gap: 8,
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Body strong>{l.nome}</Body>
                    </View>
                    {!!l.id && <Badge>Lote {l.id.slice(0, 8)}</Badge>}
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Body muted>
                      {groups.find(([key]) => key === group)?.[1]}
                    </Body>
                    <Body strong>
                      {group === "ESTOQUE"
                        ? (l.unidades ?? 1) - (l.vendidas ?? 0)
                        : group === "VENDIDOS"
                          ? (l.vendidas ?? 0)
                          : (l.unidades ?? 1)}{" "}
                      un.
                    </Body>
                  </View>
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Body muted>
                      {group === "ESTOQUE" ? "Disponível" : "Preço unitário"}
                    </Body>
                    <Body strong>
                      {group === "ESTOQUE"
                        ? (l.disponiveis ?? 0) + " un."
                        : reais(l.preco)}
                    </Body>
                  </View>
                </Card>
              </Pressable>
            ) : (
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
            ),
          )}
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
