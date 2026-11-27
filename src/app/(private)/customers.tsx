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
  Empty,
  Notice,
  Screen,
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
  const activeCount = useApiQuery<CustomerList>(account?.tenantId ? "/clientes?arquivados=false&tamanho=1&pagina=0" : null);
  const archivedCount = useApiQuery<CustomerList>(account?.tenantId ? "/clientes?arquivados=true&tamanho=1&pagina=0" : null);
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
        <View style={{ flexDirection: "row", padding: 3, borderRadius: 12, backgroundColor: t.accentTint, gap: 4 }}>
          {[{ label: `Ativos ${activeCount.data?.clientes?.total ?? ""}`, value: false }, { label: `Arquivados ${archivedCount.data?.clientes?.total ?? ""}`, value: true }].map(({ label, value }) => (
            <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: filter.arquivados === value }} onPress={() => setCustomers({ ...filter, arquivados: value, pagina: 0 })} style={{ flex: 1, minHeight: 38, justifyContent: "center", alignItems: "center", borderRadius: 9, backgroundColor: filter.arquivados === value ? t.surface : "transparent", borderWidth: filter.arquivados === value ? 1 : 0, borderColor: t.border }}><Text style={{ color: t.text, fontSize: 13, fontWeight: filter.arquivados === value ? "700" : "500" }}>{label}</Text></Pressable>
          ))}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1, minWidth: 0 }}><ListSearch style={{ minHeight: 40, borderRadius: 9 }} accessibilityLabel="Buscar clientes" placeholder="Nome, telefone ou e-mail" value={filter.busca} onChangeText={(busca) => setCustomers({ ...filter, busca, pagina: 0 })} /></View>
          {!filter.arquivados && <Button compact label="+ Novo" onPress={() => router.push({ pathname: "/customers/[id]", params: { id: "new" } })} />}
        </View>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.cliente!.id!}
        style={rows.length ? { marginHorizontal: 16, borderWidth: 1, borderColor: t.border, borderRadius: 13, backgroundColor: t.surface } : undefined}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 0, paddingBottom: 12 }}
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
          <CustomerItem item={item} disabled={first.loading} last={rows[rows.length - 1] === item} />
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
  last,
}: {
  item: CustomerRow;
  disabled: boolean;
  last: boolean;
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
          params: {
            id: customer!.id!,
            orcamentos: String(item.orcamentos ?? 0),
            emAndamento: String(item.emAndamento ?? 0),
          },
        })
      }
      style={({ pressed }) => ({ minHeight: 66, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, borderBottomWidth: last ? 0 : 1, borderColor: t.border, opacity: pressed ? 0.75 : 1 })}
    >
        <View style={{ flexDirection: "row", gap: 10, alignItems: "center", flex: 1, minWidth: 0 }}>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
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
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Text numberOfLines={1} style={{ flex: 1, minWidth: 0, color: t.text, fontWeight: "700", fontSize: 15 }}>
                {customer?.nome}
              </Text>
              {!!item.emAndamento && (
                <Text numberOfLines={1} style={{ color: "#844900", backgroundColor: "#fff0d7", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, fontSize: 10, flexShrink: 0 }}>
                  {item.emAndamento} em andamento{item.emAndamento === 1 ? "" : "s"}
                </Text>
              )}
            </View>
            <Text numberOfLines={1} style={{ color: t.muted, fontSize: 11 }}>{phone(customer?.telefone)} · {item.orcamentos ?? 0} {item.orcamentos === 1 ? "orçamento" : "orçamentos"}</Text>
          </View>
        </View>
        <Text style={{ color: t.primaryText, fontSize: 18 }}>›</Text>
    </Pressable>
  );
}
