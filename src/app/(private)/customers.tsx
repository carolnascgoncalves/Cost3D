import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  RefreshControl,
  Pressable,
  Text,
  View,
} from "react-native";
import { ListSearch } from "@/components/list-search";
import { ModuleScreen } from "@/components/module-screen";
import { useAuth } from "@/auth/provider";
import {
  Body,
  Button,
  Card,
  Chip,
  Empty,
  Notice,
  Pagination,
  Screen,
  layout,
} from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { defaultCustomers, useWorkspace } from "@/features/workspace";
import type { CustomerList, CustomerRow } from "@/features/contracts";
export default function Customers() {
  const t = useTheme();
  const mobile = useWindowDimensions().width < 900;
  const { account } = useAuth();
  const { customers: filter, setCustomers } = useWorkspace();
  const [refreshing, setRefreshing] = useState(false);
  const path =
    "/clientes?" +
    new URLSearchParams({
      busca: filter.busca.trim(),
      arquivados: String(filter.arquivados),
      pagina: String(filter.pagina),
      tamanho: "20",
    });
  const query = useApiQuery<CustomerList>(
    account?.tenantId ? path : null,
    true,
  );
  useEffect(() => {
    if (!query.loading) setRefreshing(false);
  }, [query.loading]);
  const total = query.data?.clientes?.total || 0;

  if (!account?.tenantId)
    return (
      <Screen>
        <Empty
          title="Loja não vinculada"
          description="Esta conta não possui uma loja para consultar clientes."
        />
      </Screen>
    );
  return (
    <ModuleScreen
      section="Menu"
      title="Clientes"
      refreshControl={
        <RefreshControl
          refreshing={refreshing && query.loading}
          onRefresh={() => {
            setRefreshing(true);
            query.retry();
          }}
        />
      }
    >
      <View style={layout.row}>
        <Chip
          label="Ativos"
          selected={!filter.arquivados}
          onPress={() =>
            setCustomers({ ...filter, arquivados: false, pagina: 0 })
          }
        />
        <Chip
          label="Arquivados"
          selected={filter.arquivados}
          onPress={() =>
            setCustomers({ ...filter, arquivados: true, pagina: 0 })
          }
        />
        {!mobile && (
          <Text style={{ color: t.pageMuted }}>
            {query.data?.resumo?.ativos ?? "—"} ativos ·{" "}
            {query.data?.resumo?.arquivados ?? "—"} arquivados
          </Text>
        )}
      </View>
      <ListSearch
        accessibilityLabel="Pesquisar clientes"
        placeholder="Pesquisar por nome, telefone ou e-mail"
        value={filter.busca}
        onChangeText={(busca) =>
          setCustomers((current) => ({ ...current, busca, pagina: 0 }))
        }
      />
      <Button
        label="+ Novo cliente"
        onPress={() =>
          router.push({ pathname: "/customers/[id]", params: { id: "new" } })
        }
      />
      {filter.busca || filter.arquivados ? (
        <Button
          variant="ghost"
          label="Limpar filtros"
          onPress={() => setCustomers({ ...defaultCustomers })}
        />
      ) : null}
      {query.error ? (
        <Notice message={query.error} onRetry={query.retry} />
      ) : !query.data ? (
        <ActivityIndicator color={t.primaryText} />
      ) : (
        <>
          {(query.data.clientes?.itens ?? []).map((row) => (
            <CustomerItem
              key={row.cliente?.id}
              item={row}
              disabled={query.loading}
            />
          ))}
          {!total && !query.loading && (
            <Empty
              title="Nenhum cliente encontrado"
              description={
                filter.busca
                  ? "Tente outra busca ou limpe os filtros."
                  : filter.arquivados
                    ? "Os clientes arquivados aparecerão aqui."
                    : "Cadastre o primeiro cliente da sua loja."
              }
            />
          )}
          {total > 0 && (
            <Pagination
              page={filter.pagina}
              total={total}
              disabled={query.loading}
              onPage={(pagina) => setCustomers({ ...filter, pagina })}
            />
          )}
        </>
      )}
    </ModuleScreen>
  );
}
function CustomerItem({
  item,
  disabled,
}: {
  item: CustomerRow;
  disabled: boolean;
}) {
  const t = useTheme();
  const customer = item.cliente;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver cliente ${customer?.nome || ""}`}
      disabled={disabled || !customer?.id}
      onPress={() =>
        router.push({
          pathname: "/customers/[id]",
          params: { id: customer!.id! },
        })
      }
      style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
    >
      <Card>
        <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
          <View
            style={{
              width: 42,
              height: 42,
              borderRadius: 21,
              backgroundColor: t.accent,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text
              style={{ color: t.onAccent, fontWeight: "700", fontSize: 17 }}
            >
              {customer?.nome?.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: t.text, fontWeight: "700", fontSize: 17 }}>
              {customer?.nome}
            </Text>
            <Body muted>
              {[customer?.telefone, customer?.email]
                .filter(Boolean)
                .join(" · ") || "Sem contato informado"}
            </Body>
          </View>
          <Text style={{ color: t.primaryText, fontSize: 24 }}>›</Text>
        </View>
        <View style={layout.row}>
          <Text style={{ color: t.muted, fontSize: 12 }}>
            {item.orcamentos || 0} orçamento(s)
          </Text>
          {!!item.emAndamento && (
            <Text
              style={{
                color: t.text,
                backgroundColor: t.accentTint,
                paddingHorizontal: 9,
                paddingVertical: 5,
                borderRadius: 6,
                fontSize: 12,
              }}
            >
              {item.emAndamento} em andamento
            </Text>
          )}
        </View>
      </Card>
    </Pressable>
  );
}
