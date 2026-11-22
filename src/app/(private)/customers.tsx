import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  useWindowDimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { ModuleHeader } from "@/components/module-screen";
import { useAuth } from "@/auth/provider";
import {
  Body,
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Heading,
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
  const [search, setSearch] = useState(filter.busca);
  const path =
    "/clientes?" +
    new URLSearchParams({
      busca: filter.busca,
      arquivados: String(filter.arquivados),
      pagina: String(filter.pagina),
      tamanho: "20",
    });
  const query = useApiQuery<CustomerList>(account?.tenantId ? path : null);
  const total = query.data?.clientes?.total || 0;
  const apply = () =>
    setCustomers({ ...filter, busca: search.trim(), pagina: 0 });
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
    <Screen scroll={false}>
      <FlatList
        style={layout.list}
        contentContainerStyle={layout.listContent}
        data={query.data?.clientes?.itens || []}
        keyExtractor={(item, index) => item.cliente?.id || String(index)}
        keyboardShouldPersistTaps="handled"
        refreshing={query.loading}
        onRefresh={query.retry}
        ListHeaderComponent={
          <View style={{ gap: 20, marginBottom: 8 }}>
            {mobile && <ModuleHeader section="Menu" title="Clientes" />}
            <View style={[layout.row, { justifyContent: "space-between" }]}>
              {!mobile && (
                <Heading
                  title="Clientes"
                  subtitle="Pessoas que compram da sua loja."
                />
              )}
              <Button
                label="+ Novo cliente"
                onPress={() =>
                  router.push({
                    pathname: "/customers/[id]",
                    params: { id: "new" },
                  })
                }
              />
            </View>
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
            <Card>
              <Field
                label="Buscar cliente"
                placeholder="Nome, telefone ou e-mail"
                value={search}
                maxLength={150}
                onChangeText={setSearch}
                returnKeyType="search"
                onSubmitEditing={apply}
              />
              <View style={layout.row}>
                <Button label="Buscar" onPress={apply} />
                <Button
                  label="Limpar filtros"
                  variant="ghost"
                  onPress={() => {
                    setSearch("");
                    setCustomers({ ...defaultCustomers });
                  }}
                />
              </View>
            </Card>
            {!!query.error && (
              <Notice message={query.error} onRetry={query.retry} />
            )}
            {query.loading && (
              <ActivityIndicator
                color={t.primaryText}
                accessibilityLabel="Carregando clientes"
              />
            )}
          </View>
        }
        renderItem={({ item }) => <CustomerItem item={item} />}
        ListEmptyComponent={
          !query.loading && !query.error ? (
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
          ) : undefined
        }
        ListFooterComponent={
          !query.loading && !query.error && total > 0 ? (
            <Pagination
              page={filter.pagina}
              total={total}
              onPage={(pagina) => setCustomers({ ...filter, pagina })}
            />
          ) : undefined
        }
      />
    </Screen>
  );
}
function CustomerItem({ item }: { item: CustomerRow }) {
  const t = useTheme();
  const customer = item.cliente;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Ver cliente ${customer?.nome || ""}`}
      disabled={!customer?.id}
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
