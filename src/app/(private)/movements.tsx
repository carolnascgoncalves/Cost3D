import { FormScrollView } from "@/components/form-scroll";
import { ModuleScreen } from "@/components/module-screen";
import { CalculationPhoto } from "@/features/mobile-calculations";
import { Icon } from "@/components/icon";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
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
  const [pull, setPull] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const mobile = width < 900;
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
    true,
  );
  useEffect(() => {
    if (!query.loading) setPull(false);
  }, [query.loading]);
  const grams = query.data?.resumo?.find((row) => row.medida === "g");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  function displayDate(iso: string) {
    return iso.split("-").reverse().join("/");
  }
  function periodStart(days: number) {
    const start = new Date(today + "T12:00:00Z");
    if (days === 0) start.setUTCDate(1);
    else start.setUTCDate(start.getUTCDate() - days + 1);
    return start.toISOString().slice(0, 10);
  }
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
    if (mobile) setExpanded(false);
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
  const filterFields = (
    <View style={{ gap: 12 }}>
      {mobile && (
        <>
          <Body muted>Tipo</Body>
          <View style={layout.row}>
            {movementTypes.map(([value, label]) => (
              <Chip
                key={value}
                label={label}
                selected={draft.tipo === value}
                onPress={() =>
                  setDraft({
                    ...draft,
                    tipo: draft.tipo === value ? "" : value,
                    saldo: draft.saldo || value === "SALDO_INICIAL",
                  })
                }
              />
            ))}
          </View>
        </>
      )}

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
              onChangeText={(inicio) => setDraft({ ...draft, inicio })}
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
      {mobile && (
        <Button
          label="Limpar"
          variant="secondary"
          onPress={() => {
            clear();
            setExpanded(false);
          }}
        />
      )}
      <Button label="Aplicar filtros" onPress={apply} />
    </View>
  );
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
    <ModuleScreen
      section="Produção e gestão"
      title="Movimentações"
      refreshControl={
        <RefreshControl
          refreshing={pull && query.loading}
          onRefresh={() => {
            setPull(true);
            query.retry();
          }}
        />
      }
    >
      <View style={{ gap: 20, marginBottom: 8 }}>
        {mobile ? (
          <>
            <View style={layout.row}>
              {[
                [7, "7 dias"],
                [30, "30 dias"],
                [0, "Este mês"],
              ].map(([days, label]) => {
                const inicio = periodStart(Number(days));
                const selected =
                  !filter.tudo &&
                  ((toIsoDate(filter.inicio) === inicio &&
                    toIsoDate(filter.fim) === today) ||
                    (days === 30 && !filter.inicio && !filter.fim));
                return (
                  <Chip
                    secondary
                    icon="calendar3"
                    key={label}
                    label={String(label)}
                    selected={selected}
                    onPress={() => {
                      const next = {
                        ...filter,
                        inicio: displayDate(inicio),
                        fim: displayDate(today),
                        tudo: false,
                        pagina: 0,
                      };
                      setDraft(next);
                      setMovements(next);
                    }}
                  />
                );
              })}
            </View>
            <Card style={{ flexDirection: "row", gap: 6 }}>
              {[
                [quantity(grams?.entrou, "g", true), "Entrou"],
                [quantity(grams?.saldo, "g", true), "Saldo"],
                [quantity(query.data?.pecasVendidas), "Vendidas"],
              ].map(([value, label]) => (
                <View key={label} style={{ flex: 1, alignItems: "center" }}>
                  <Text
                    style={{
                      fontWeight: "700",
                      fontSize: 17,
                      color:
                        label === "Entrou"
                          ? t.success
                          : label === "Saldo" && grams?.saldo?.startsWith("-")
                            ? t.danger
                            : t.primaryText,
                    }}
                  >
                    {query.data ? value : "—"}
                  </Text>
                  <Body muted>{label}</Body>
                </View>
              ))}
            </Card>
          </>
        ) : (
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
        )}
        <View style={{ gap: 8 }}>
          {mobile ? (
            <View style={{ flexDirection: "row", gap: 8 }}>
              <TextInput
                accessibilityLabel="Pesquisar no extrato"
                placeholder="Pesquisar"
                placeholderTextColor={t.muted}
                style={{
                  flex: 1,
                  color: t.text,
                  backgroundColor: t.surface,
                  borderColor: t.border,
                  borderWidth: 1,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                }}
                value={draft.busca}
                maxLength={150}
                onChangeText={(busca) => setDraft({ ...draft, busca })}
                returnKeyType="search"
                onSubmitEditing={apply}
              />
              <Button
                label="Filtros"
                variant="secondary"
                onPress={() => {
                  setDraft({ ...filter, busca: draft.busca });
                  setError("");
                  setExpanded(true);
                }}
              />
            </View>
          ) : (
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
                  label={
                    mobile
                      ? "Filtros"
                      : expanded
                        ? "Recolher filtros"
                        : "Mais filtros"
                  }
                  variant="secondary"
                  onPress={() => {
                    if (mobile) {
                      setDraft({ ...filter, busca: draft.busca });
                      setError("");
                    }
                    setExpanded(!expanded);
                  }}
                />
                {!mobile && (
                  <Button
                    label="Limpar filtros"
                    variant="ghost"
                    onPress={clear}
                  />
                )}
              </View>
              {expanded && !mobile && filterFields}
            </Card>
          )}
          {mobile && (
            <Modal
              visible={expanded}
              transparent
              animationType="slide"
              onRequestClose={() => setExpanded(false)}
            >
              <View
                style={{
                  flex: 1,
                  justifyContent: "flex-end",
                  backgroundColor: "#24183580",
                }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar filtros"
                  onPress={() => setExpanded(false)}
                  style={{ flex: 1 }}
                />
                <FormScrollView
                  keyboardShouldPersistTaps="handled"
                  style={{
                    flexGrow: 0,
                    maxHeight: "85%",
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                    backgroundColor: t.surface,
                  }}
                  contentContainerStyle={{
                    padding: 20,
                    paddingBottom: 32,
                    gap: 12,
                  }}
                >
                  <Body strong>Filtros</Body>
                  {filterFields}
                  {!!error && <Notice message={error} />}
                </FormScrollView>
              </View>
            </Modal>
          )}
          {!!error && (!mobile || !expanded) && <Notice message={error} />}
        </View>
        {!mobile && (
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
        )}
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
              Estoque de abertura: {quantity(query.data.abertura.gramas, "g")}{" "}
              em {query.data.abertura.registros} registro(s).
            </Body>
          </Card>
        )}
        {!!query.error && (
          <Notice message={query.error} onRetry={query.retry} />
        )}
        {query.loading && !query.data && (
          <ActivityIndicator
            color={t.primaryText}
            accessibilityLabel="Carregando movimentações"
          />
        )}
      </View>
      {query.data?.movimentacoes?.itens?.map((item, index) => (
        <MovementItem key={item.id ?? index} item={item} />
      ))}
      {!total && !query.loading && !query.error ? (
        <Empty
          title="Nenhuma movimentação encontrada"
          description="Tente outro período ou limpe os filtros."
        />
      ) : undefined}
      {!query.error && total > 0 ? (
        <Pagination
          disabled={query.loading}
          page={filter.pagina}
          total={total}
          onPage={(pagina) => setMovements({ ...filter, pagina })}
        />
      ) : undefined}
    </ModuleScreen>
  );
}
function MovementItem({ item }: { item: Movement }) {
  const t = useTheme();
  const mobile = useWindowDimensions().width < 900;
  const negative = item.quantidade?.startsWith("-");
  const { title, detail } = productionDescription(item.descricao, item.tipo);
  const color =
    item.tipo === "SALDO_INICIAL" ? t.muted : negative ? t.danger : t.success;
  const swatch =
    item.codigoCor && /^#[0-9a-f]{6}$/i.test(item.codigoCor)
      ? item.codigoCor
      : null;
  const hasPhoto = item.origem === "lote" && !!item.referencia;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        {hasPhoto ? (
          <CalculationPhoto id={item.referencia} name={detail || title} />
        ) : (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: t.accentTint,
            }}
          >
            {swatch ? (
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: swatch,
                  borderWidth: 1,
                  borderColor: t.border,
                }}
              />
            ) : (
              <Icon
                name={
                  item.tipo?.includes("VENDA")
                    ? "shop"
                    : item.medida === "g"
                      ? "palette"
                      : "arrow-switch"
                }
                color={t.primaryText}
              />
            )}
          </View>
        )}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            {hasPhoto && swatch && (
              <View
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: 7,
                  borderWidth: 1,
                  borderColor: t.border,
                  backgroundColor: swatch,
                }}
              />
            )}
            <Text
              style={{
                flexShrink: 1,
                fontSize: 16,
                fontWeight: "700",
                color: t.text,
              }}
            >
              {title || "Movimentação"}
            </Text>
          </View>
          {!!detail && <Body muted>{detail}</Body>}
          <Body muted>{movementLabels[item.tipo || ""] || item.tipo}</Body>
        </View>
        <Text
          selectable
          style={{ fontSize: mobile ? 15 : 18, fontWeight: "700", color }}
        >
          {quantity(item.quantidade, item.medida, true)}
        </Text>
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          justifyContent: "space-between",
          gap: 6,
          borderTopWidth: 1,
          borderColor: t.border,
          paddingTop: 8,
        }}
      >
        <Body muted>{dateTime(item.data)}</Body>
        {item.saldoApos != null && (
          <Text style={{ color: t.primaryText, fontWeight: "600" }}>
            Saldo após · {quantity(item.saldoApos, "g")}
          </Text>
        )}
      </View>
    </Card>
  );
}
