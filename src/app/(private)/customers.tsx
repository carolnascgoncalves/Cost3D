import { phone } from "@/features/format";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { request } from "@/api/session";
import { ListSearch } from "@/components/list-search";
import { ModuleHeader } from "@/components/module-screen";
import { useAuth } from "@/auth/provider";
import {
  Body,
  Button,
  Card,
  Empty,
  Notice,
  Screen,
  layout,
} from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { useWorkspace } from "@/features/workspace";
import type { CustomerList, CustomerRow } from "@/features/contracts";

function avatarColor(seed: string) {
  const colors = ["#6854a0", "#27663f", "#893d37", "#295c87", "#815229"];
  return colors[
    Array.from(seed).reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 0) %
      colors.length
  ];
}
export default function Customers() {
  const { account } = useAuth();
  const { customers: filter, setCustomers } = useWorkspace();
  const t = useTheme();
  const base =
    "/clientes?" +
    new URLSearchParams({
      busca: filter.busca.trim(),
      arquivados: String(filter.arquivados),
      tamanho: "20",
    });
  const first = useApiQuery<CustomerList>(
    account?.tenantId ? base + "&pagina=0" : null,
    true,
  );
  const [extra, setExtra] = useState<{
    first: CustomerList;
    page: number;
    rows: CustomerRow[];
  }>();
  const [loadingMore, setLoadingMore] = useState(false),
    [error, setError] = useState(""),
    [pull, setPull] = useState(false);
  const pending = useRef(false);
  useEffect(() => {
    setError("");
  }, [base, first.data]);
  useEffect(() => {
    if (!first.loading) setPull(false);
  }, [first.loading]);
  const more = extra && extra.first === first.data ? extra : undefined;
  const rows = [...(first.data?.clientes?.itens ?? []), ...(more?.rows ?? [])];
  async function next() {
    if (
      pending.current ||
      first.loading ||
      first.error ||
      !first.data ||
      rows.length >= (first.data.clientes?.total ?? 0)
    )
      return;
    pending.current = true;
    setLoadingMore(true);
    setError("");
    const page = (more?.page ?? 0) + 1;
    try {
      const data = await request<CustomerList>(base + "&pagina=" + page);
      setExtra({
        first: first.data,
        page,
        rows: [...(more?.rows ?? []), ...(data.clientes?.itens ?? [])],
      });
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível carregar mais clientes.",
      );
    } finally {
      pending.current = false;
      setLoadingMore(false);
    }
  }
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
    <View style={{ flex: 1, backgroundColor: t.background }}>
      <ModuleHeader section="Comercial" title="Clientes" lightHeader />
      <View style={{ paddingHorizontal: 16, gap: 10, paddingBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {["Ativos", "Arquivados"].map((label, i) => (
            <View key={label} style={{ flex: 1 }}>
              <Button
                label={label}
                variant={filter.arquivados === !!i ? "primary" : "secondary"}
                onPress={() =>
                  setCustomers({ ...filter, arquivados: !!i, pagina: 0 })
                }
              />
            </View>
          ))}
        </View>
        <ListSearch
          accessibilityLabel="Buscar clientes"
          placeholder="Buscar clientes por nome, telefone ou e-mail"
          value={filter.busca}
          onChangeText={(busca) =>
            setCustomers({ ...filter, busca, pagina: 0 })
          }
        />
        {!filter.arquivados && (
          <Button
            label="+ Novo cliente"
            onPress={() =>
              router.push({ pathname: "/customers/[id]", params: { id: "new" } })
            }
          />
        )}
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.cliente!.id!}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 10,
          paddingBottom: 84,
        }}
        keyboardShouldPersistTaps="handled"
        refreshing={pull && first.loading}
        onRefresh={() => {
          setPull(true);
          first.retry();
        }}
        onEndReached={() => {
          if (!error) void next();
        }}
        onEndReachedThreshold={0.4}
        renderItem={({ item }) => (
          <CustomerItem item={item} disabled={first.loading} />
        )}
        ListEmptyComponent={
          first.loading ? (
            <ActivityIndicator />
          ) : first.error ? undefined : (
            <Empty
              title={
                filter.busca
                  ? `Nenhum cliente encontrado para “${filter.busca}”`
                  : "Nenhum cliente encontrado"
              }
              description={
                filter.busca
                  ? "Confira o texto ou limpe a busca para ver todos os clientes."
                  : filter.arquivados
                    ? "Os clientes arquivados aparecerão aqui."
                    : "Cadastre o primeiro cliente da sua loja."
              }
              actionLabel={filter.busca ? "Limpar busca" : undefined}
              onAction={
                filter.busca
                  ? () => setCustomers({ ...filter, busca: "", pagina: 0 })
                  : undefined
              }
            />
          )
        }
        ListFooterComponent={
          first.error ? (
            <Notice message={first.error} onRetry={first.retry} />
          ) : error ? (
            <Notice message={error} onRetry={() => void next()} />
          ) : loadingMore ? (
            <ActivityIndicator />
          ) : undefined
        }
      />
    </View>
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
              backgroundColor: avatarColor(
                customer?.id || customer?.nome || "",
              ),
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: "#fff", fontWeight: "700", fontSize: 17 }}>
              {customer?.nome?.slice(0, 1).toUpperCase()}
            </Text>
          </View>
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={{ color: t.text, fontWeight: "700", fontSize: 17 }}>
              {customer?.nome}
            </Text>
            <Body muted>{phone(customer?.telefone)}</Body>
          </View>
          <Text style={{ color: t.primaryText, fontSize: 24 }}>›</Text>
        </View>
        <View style={layout.row}>
          <Text style={{ color: t.muted, fontSize: 12 }}>
            {item.orcamentos
              ? item.orcamentos +
                (item.orcamentos === 1 ? " orçamento" : " orçamentos")
              : "Sem orçamentos"}
          </Text>
          {!!item.emAndamento && (
            <Text
              style={{
                color: "#844900",
                backgroundColor: "#fff0d7",
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
