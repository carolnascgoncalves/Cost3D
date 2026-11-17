import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
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
import { defaultMovements, useWorkspace } from "@/features/workspace";
import {
  movementLabels,
  movementTypes,
  type Movement,
  type Statement,
} from "@/features/contracts";
import {
  dateTime,
  decimal,
  productionDescription,
  quantity,
  toIsoDate,
} from "@/features/format";
export default function Movements() {
  const t = useTheme();
  const { account } = useAuth();
  const { movements: filter, setMovements } = useWorkspace();
  const [draft, setDraft] = useState(filter);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const wide = useWindowDimensions().width >= 700;
  const params = new URLSearchParams({
    busca: filter.busca,
    tipo: filter.tipo,
    direcao: filter.direcao,
    tudo: String(filter.tudo),
    saldo: String(filter.saldo),
    pagina: String(filter.pagina),
    tamanho: "20",
  });
  if (!filter.tudo) {
    if (filter.inicio) params.set("inicio", toIsoDate(filter.inicio)!);
    if (filter.fim) params.set("fim", toIsoDate(filter.fim)!);
  }
  const query = useApiQuery<Statement>(
    account?.tenantId ? "/extrato?" + params : null,
  );
  const total = query.data?.movimentacoes?.total || 0;
  function apply() {
    const start = toIsoDate(draft.inicio),
      end = toIsoDate(draft.fim);
    if (!draft.tudo && (start === null || end === null)) {
      setError("Use uma data válida no formato dd/mm/aaaa.");
      return;
    }
    if (!draft.tudo && start && end && start > end) {
      setError("A data inicial deve ser anterior ou igual à final.");
      return;
    }
    setError("");
    setMovements({ ...draft, busca: draft.busca.trim(), pagina: 0 });
  }
  function clear() {
    setDraft({ ...defaultMovements });
    setMovements({ ...defaultMovements });
    setError("");
  }
  function type(value: string) {
    const tipo = filter.tipo === value ? "" : value;
    const saldo = tipo === "SALDO_INICIAL" || filter.saldo;
    setMovements({ ...filter, tipo, saldo, pagina: 0 });
    setDraft({ ...draft, tipo, saldo });
  }
  if (!account?.tenantId)
    return (
      <Screen>
        <Empty
          title="Loja não vinculada"
          description="Esta conta não possui uma loja para consultar movimentações."
        />
      </Screen>
    );
  return (
    <Screen scroll={false}>
      <FlatList
        style={layout.list}
        contentContainerStyle={layout.listContent}
        data={query.data?.movimentacoes?.itens || []}
        keyExtractor={(item, index) => item.id || String(index)}
        keyboardShouldPersistTaps="handled"
        refreshing={query.loading}
        onRefresh={query.retry}
        ListHeaderComponent={
          <View style={{ gap: 20, marginBottom: 8 }}>
            <Heading
              title="Movimentações"
              subtitle="Materiais, produção e vendas no mesmo extrato."
            />
            <Card>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 20 }}>
                <View style={{ flex: 1, minWidth: 130, gap: 5 }}>
                  <Body muted>Peças vendidas</Body>
                  <Text
                    style={{ fontSize: 25, fontWeight: "700", color: t.text }}
                  >
                    {query.data ? decimal(query.data.pecasVendidas) : "—"} un.
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 130, gap: 5 }}>
                  <Body muted>Registros no filtro</Body>
                  <Text
                    style={{ fontSize: 25, fontWeight: "700", color: t.text }}
                  >
                    {query.data ? total : "—"}
                  </Text>
                </View>
              </View>
              {query.data?.resumo?.map((summary, index) => (
                <View key={summary.medida || index} style={layout.row}>
                  <Text style={{ color: t.success, fontSize: 13 }}>
                    Entradas: {quantity(summary.entrou, summary.medida)}
                  </Text>
                  <Text style={{ color: t.danger, fontSize: 13 }}>
                    Saídas: {quantity(summary.saiu, summary.medida)}
                  </Text>
                </View>
              ))}
            </Card>
            <Card>
              <Field
                label="Buscar no extrato"
                placeholder="Material, peça ou descrição"
                value={draft.busca}
                maxLength={150}
                onChangeText={(busca) => setDraft({ ...draft, busca })}
                returnKeyType="search"
                onSubmitEditing={apply}
              />
              <View style={layout.row}>
                <Button label="Buscar" onPress={apply} />
                <Button
                  label={expanded ? "Recolher filtros" : "Mais filtros"}
                  variant="secondary"
                  onPress={() => setExpanded(!expanded)}
                />
                <Button
                  label="Limpar filtros"
                  variant="ghost"
                  onPress={clear}
                />
              </View>
              {expanded && (
                <View style={{ gap: 16 }}>
                  <View style={layout.row}>
                    <Chip
                      label="Últimos 30 dias / datas"
                      selected={!draft.tudo}
                      onPress={() => setDraft({ ...draft, tudo: false })}
                    />
                    <Chip
                      label="Todo o período"
                      selected={draft.tudo}
                      onPress={() => setDraft({ ...draft, tudo: true })}
                    />
                  </View>
                  {!draft.tudo && (
                    <View
                      style={{
                        flexDirection: wide ? "row" : "column",
                        gap: 12,
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Data inicial"
                          placeholder="dd/mm/aaaa"
                          value={draft.inicio}
                          maxLength={10}
                          keyboardType="numbers-and-punctuation"
                          onChangeText={(inicio) =>
                            setDraft({ ...draft, inicio })
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field
                          label="Data final"
                          placeholder="dd/mm/aaaa"
                          value={draft.fim}
                          maxLength={10}
                          keyboardType="numbers-and-punctuation"
                          onChangeText={(fim) => setDraft({ ...draft, fim })}
                        />
                      </View>
                    </View>
                  )}
                  <Body muted>
                    Datas vazias usam o intervalo padrão dos últimos 30 dias.
                  </Body>
                  <View style={layout.row}>
                    {[
                      ["", "Entradas e saídas"],
                      ["entrada", "Só entradas"],
                      ["saida", "Só saídas"],
                    ].map(([value, label]) => (
                      <Chip
                        key={value}
                        label={label}
                        selected={draft.direcao === value}
                        onPress={() => setDraft({ ...draft, direcao: value })}
                      />
                    ))}
                  </View>
                  <Chip
                    label="Incluir saldos iniciais"
                    selected={draft.saldo}
                    onPress={() => setDraft({ ...draft, saldo: !draft.saldo })}
                  />
                  <Button label="Aplicar filtros" onPress={apply} />
                </View>
              )}
              {!!error && <Notice message={error} />}
            </Card>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              keyboardShouldPersistTaps="handled"
            >
              {movementTypes.map(([value, label]) => (
                <Chip
                  key={value}
                  label={label}
                  selected={filter.tipo === value}
                  onPress={() => type(value)}
                />
              ))}
            </ScrollView>
            <Text style={{ color: t.pageMuted, fontSize: 12, lineHeight: 19 }}>
              {filter.tudo
                ? "Todo o período"
                : filter.inicio || filter.fim
                  ? `${filter.inicio || "30 dias atrás"} até ${filter.fim || "hoje"}`
                  : "Últimos 30 dias"}
              {filter.direcao
                ? ` · ${filter.direcao === "entrada" ? "Só entradas" : "Só saídas"}`
                : ""}
              {filter.saldo ? " · Com saldos iniciais" : ""}
              {filter.busca ? ` · Busca: ${filter.busca}` : ""}
            </Text>
            {!!query.data?.abertura?.registros && (
              <Card>
                <Body muted>
                  Estoque de abertura:{" "}
                  {quantity(query.data.abertura.gramas, "g")} em{" "}
                  {query.data.abertura.registros} registro(s).
                </Body>
              </Card>
            )}
            {!!query.error && (
              <Notice message={query.error} onRetry={query.retry} />
            )}
            {query.loading && (
              <ActivityIndicator
                color={t.primaryText}
                accessibilityLabel="Carregando movimentações"
              />
            )}
          </View>
        }
        renderItem={({ item }) => <MovementItem item={item} />}
        ListEmptyComponent={
          !query.loading && !query.error ? (
            <Empty
              title="Nenhuma movimentação encontrada"
              description="Tente outro período ou limpe os filtros."
            />
          ) : undefined
        }
        ListFooterComponent={
          !query.loading && !query.error && total > 0 ? (
            <Pagination
              page={filter.pagina}
              total={total}
              onPage={(pagina) => setMovements({ ...filter, pagina })}
            />
          ) : undefined
        }
      />
    </Screen>
  );
}
function MovementItem({ item }: { item: Movement }) {
  const t = useTheme();
  const negative = item.quantidade?.startsWith("-");
  const { title, detail } = productionDescription(item.descricao, item.tipo);
  const color = negative ? t.danger : t.success;
  return (
    <Card>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}>
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: t.accentTint,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color, fontSize: 20 }}>{negative ? "↗" : "↙"}</Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={layout.row}>
            <Text
              style={{
                color: t.text,
                fontSize: 16,
                fontWeight: "700",
                flexShrink: 1,
              }}
            >
              {title || "Movimentação"}
            </Text>
            <Text
              style={{
                color: t.text,
                backgroundColor: t.accentTint,
                fontSize: 11,
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 5,
              }}
            >
              {movementLabels[item.tipo || ""] || item.tipo}
            </Text>
          </View>
          <Text style={{ color: t.muted, fontSize: 12, lineHeight: 19 }}>
            {detail ? detail + " · " : ""}
            {dateTime(item.data)}
          </Text>
          <Text selectable style={{ color, fontSize: 18, fontWeight: "700" }}>
            {quantity(item.quantidade, item.medida, true)}
          </Text>
          {item.saldoApos != null && (
            <Text style={{ color: t.muted, fontSize: 12 }}>
              Saldo após: {quantity(item.saldoApos, "g")}
            </Text>
          )}
        </View>
      </View>
    </Card>
  );
}
