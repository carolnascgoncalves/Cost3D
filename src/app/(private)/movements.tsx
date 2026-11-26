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
  const [choosingType, setChoosingType] = useState(false);
  const [customPeriod, setCustomPeriod] = useState(false);
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
  const groupedMovements = (query.data?.movimentacoes?.itens ?? []).reduce<
    { key: string; items: Movement[] }[]
  >((groups, item) => {
    const parsed = item.data ? new Date(item.data) : null;
    const key =
      parsed && !Number.isNaN(parsed.getTime())
        ? new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Sao_Paulo",
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
          }).format(parsed)
        : "sem-data";
    const last = groups.at(-1);
    if (last?.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
    return groups;
  }, []);
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
    if (mobile) {
      setChoosingType(false);
      setExpanded(false);
    }
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
      {mobile ? (
        <>
          <Body muted>Período</Body>
          <View style={{ ...layout.row, flexWrap: "wrap" }}>
            {[[7, "7 dias"], [30, "30 dias"], [0, "Este mês"]].map(([days, label]) => {
              const start = periodStart(Number(days));
              const selected = !customPeriod && !draft.tudo && ((toIsoDate(draft.inicio) === start && toIsoDate(draft.fim) === today) || (Number(days) === 30 && !draft.inicio && !draft.fim));
              return <Chip key={String(label)} label={String(label)} selected={selected} onPress={() => { setCustomPeriod(false); setDraft({ ...draft, inicio: displayDate(start), fim: displayDate(today), tudo: false }); }} />;
            })}
            <Chip label="Personalizado" selected={customPeriod} onPress={() => { setCustomPeriod(true); setDraft({ ...draft, inicio: draft.inicio || displayDate(periodStart(30)), fim: draft.fim || displayDate(today), tudo: false }); }} />
          </View>
          {customPeriod && !draft.tudo && (
            <View style={{ flexDirection: wide ? "row" : "column", gap: 8 }}>
              <Field label="Data inicial" placeholder="dd/mm/aaaa" value={draft.inicio} maxLength={10} keyboardType="numbers-and-punctuation" onChangeText={(inicio) => setDraft({ ...draft, inicio })} />
              <Field label="Data final" placeholder="dd/mm/aaaa" value={draft.fim} maxLength={10} keyboardType="numbers-and-punctuation" onChangeText={(fim) => setDraft({ ...draft, fim })} />
            </View>
          )}
          <Pressable accessibilityRole="button" accessibilityState={{ selected: draft.tudo }} onPress={() => { setCustomPeriod(false); setDraft({ ...draft, tudo: !draft.tudo }); }} style={{ width: "100%", minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1, borderColor: draft.tudo ? t.primary : t.border, backgroundColor: draft.tudo ? t.primary : t.surface }}><Text style={{ color: draft.tudo ? t.onPrimary : t.primaryText, fontWeight: "600" }}>Todo o período</Text></Pressable>
          <Body muted>Direção</Body>
          <View style={{ ...layout.row, flexWrap: "nowrap" }}>
            {[["", "Todas"], ["entrada", "Entradas"], ["saida", "Saídas"]].map(([value, label]) => <View key={value} style={{ flex: 1 }}><Chip label={label} selected={draft.direcao === value} onPress={() => setDraft({ ...draft, direcao: value })} /></View>)}
          </View>
          <Body muted>Tipo</Body>
          <Pressable onPress={() => setChoosingType(true)} style={{ minHeight: 44, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Body>{movementTypes.find(([value]) => value === draft.tipo)?.[1] ?? "Todos os tipos"}</Body><Icon name="chevron-right" color={t.primaryText} />
          </Pressable>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Body>Mostrar saldos iniciais</Body><Chip label={draft.saldo ? "Ligado" : "Desligado"} selected={draft.saldo} onPress={() => setDraft({ ...draft, saldo: !draft.saldo })} />
          </View>
          <View style={{ ...layout.row, marginTop: 4 }}>
            <View style={{ flex: 1 }}><Button label="Limpar" variant="secondary" onPress={() => { setDraft({ ...defaultMovements }); setError(""); }} /></View>
            <View style={{ flex: 1 }}><Button label="Aplicar" onPress={apply} /></View>
          </View>
        </>
      ) : (
      <>
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
      </>
      )}
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
                  setCustomPeriod(!!filter.inicio && ![periodStart(7), periodStart(30), periodStart(0)].includes(toIsoDate(filter.inicio) || ""));
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
                      setCustomPeriod(!!filter.inicio && ![periodStart(7), periodStart(30), periodStart(0)].includes(toIsoDate(filter.inicio) || ""));
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
                  <View style={{ ...layout.row, justifyContent: "space-between", alignItems: "center" }}>
                    <Body strong>Filtros</Body>
                    <Pressable accessibilityRole="button" accessibilityLabel="Fechar filtros" onPress={() => setExpanded(false)} style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: t.border, borderRadius: 10 }}><Text style={{ color: t.primaryText, fontSize: 22 }}>×</Text></Pressable>
                  </View>
                  {filterFields}
                  {!!error && <Notice message={error} />}
                </FormScrollView>
              </View>
            </Modal>
          )}
          {mobile && (
            <Modal visible={choosingType} transparent animationType="slide" onRequestClose={() => setChoosingType(false)}>
              <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#24183580" }}>
                <Pressable onPress={() => setChoosingType(false)} style={{ flex: 1 }} />
                <View style={{ maxHeight: "65%", backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, gap: 8 }}>
                  <View style={{ ...layout.row, justifyContent: "space-between" }}><Body strong>Tipo</Body><Button label="Fechar" variant="ghost" onPress={() => setChoosingType(false)} /></View>
                  {movementTypes.map(([value, label]) => <Pressable key={value} onPress={() => { const saldo = value === "SALDO_INICIAL" || draft.saldo; setDraft({ ...draft, tipo: value, saldo }); setChoosingType(false); }} style={{ minHeight: 44, justifyContent: "center", borderBottomWidth: 1, borderBottomColor: t.border }}><Body strong={draft.tipo === value}>{value ? label : "Todos os tipos"}</Body></Pressable>)}
                </View>
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
      {groupedMovements.map((group) => {
        const date =
          group.key === "sem-data" ? null : new Date(group.key + "T12:00:00");
        const label = date
          ? new Intl.DateTimeFormat("pt-BR", {
              day: "numeric",
              month: "long",
              timeZone: "America/Sao_Paulo",
            }).format(date)
          : "Data não informada";
        return (
          <View
            key={group.key}
            style={{
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              overflow: "hidden",
              backgroundColor: t.surface,
              marginBottom: 10,
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 9,
                backgroundColor: t.accentTint,
              }}
            >
              <Text style={{ color: t.primaryText, fontSize: 13 }}>
                {group.key === today ? "Hoje · " : ""}
                {label}
              </Text>
            </View>
            {group.items.map((item, index) => (
              <MovementItem
                key={item.id ?? index}
                item={item}
                last={index === group.items.length - 1}
              />
            ))}
          </View>
        );
      })}
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
function MovementItem({ item, last }: { item: Movement; last: boolean }) {
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
    <View
      style={{
        minHeight: 72,
        paddingHorizontal: 12,
        paddingVertical: 9,
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        borderBottomWidth: last ? 0 : 1,
        borderColor: t.border,
      }}
    >
      {hasPhoto ? (
        <CalculationPhoto
          id={item.referencia}
          name={detail || title}
          size={38}
        />
      ) : (
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: negative ? t.dangerBackground : t.success + "30",
          }}
        >
          {swatch ? (
            <View
              style={{
                width: 16,
                height: 16,
                borderRadius: 8,
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
              color={color}
              size={18}
            />
          )}
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flexWrap: "wrap",
          }}
        >
          {hasPhoto && swatch && (
            <View
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: swatch,
              }}
            />
          )}
          <Text
            style={{
              flexShrink: 1,
              fontSize: 15,
              fontWeight: "700",
              color: t.text,
            }}
          >
            {title || "Movimentação"}
          </Text>
          <Text
            style={{
              color: t.primaryText,
              backgroundColor: t.accentTint,
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 7,
              fontSize: 11,
              fontWeight: "600",
            }}
          >
            {movementLabels[item.tipo || ""] || item.tipo}
          </Text>
        </View>
        <Body muted>
          {item.tipo === "VENDA_3D" || item.tipo === "VENDA_PRODUTO"
            ? "Venda registrada"
            : detail || movementLabels[item.tipo || ""] || item.tipo}
          {item.data ? " · " + dateTime(item.data).split(", ").at(-1) : ""}
        </Body>
        {item.saldoApos != null && (
          <Body muted>Saldo após: {quantity(item.saldoApos, "g")}</Body>
        )}
      </View>
      <Text
        selectable
        style={{ fontSize: mobile ? 14 : 16, fontWeight: "700", color }}
      >
        {quantity(item.quantidade, item.medida, true)}
      </Text>
      <Icon name="chevron-right" size={15} color={t.muted} />
    </View>
  );
}
