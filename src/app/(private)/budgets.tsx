import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/provider";
import { Body, Button, Card, Chip, Notice, Pagination } from "@/components/ui";
import { ModuleScreen } from "@/components/module-screen";
import { Icon } from "@/components/icon";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import { BudgetWizard } from "@/features/budget-wizard";
import { Metric, money, row, type Summary } from "@/features/budget-ui";
type List = {
  itens: Summary[];
  total: number;
  tamanho: number;
  receber: number;
  prontos: number;
  produzir: number;
};
const filters = [
  ["RASCUNHO", "Rascunho"],
  ["APROVADO", "A produzir"],
  ["PRONTO", "Pronto"],
  ["ENTREGUE", "Entregue"],
  ["ENVIADO", "Enviado"],
  ["CANCELADO", "Cancelado"],
];
export default function Budgets() {
  const t = useTheme(),
    params = useLocalSearchParams<{ id?: string }>(),
    [id, select] = useState(params.id || ""),
    [details, showDetails] = useState(false),
    [archived, archive] = useState(false),
    [filtersOpen, setFiltersOpen] = useState(false),
    [selectedStatuses, setSelectedStatuses] = useState<string[]>([]),
    [draftStatuses, setDraftStatuses] = useState<string[]>([]),
    [page, setPage] = useState(0),
    [confirm, setConfirm] = useState<{ s: Summary; action: string }>(),
    [error, setError] = useState(""),
    [busy, working] = useState(false);
  const q = useApiQuery<List>(
    id
      ? null
      : "/orcamentos?pagina=" +
          page +
          "&arquivados=" +
          archived +
          (selectedStatuses.length
            ? "&status=" + selectedStatuses.join(",")
            : ""),
  );
  async function act() {
    if (!confirm || busy) return;
    working(true);
    setError("");
    try {
      await request(
        "/orcamentos/" +
          confirm.s.id +
          "/" +
          confirm.action +
          "?revisao=" +
          confirm.s.revisao,
        { method: "POST" },
      );
      setConfirm(undefined);
      q.retry();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      working(false);
    }
  }
  function openDetails(id: string) {
    showDetails(true);
    select(id);
  }
  function close() {
    showDetails(false);
    select("");
    setConfirm(undefined);
    if (params.id) router.setParams({ id: "" });
    q.retry();
  }
  if (id)
    return (
      <BudgetWizard key={id} id={id} close={close} startInDetails={details} />
    );
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        lightHeader
        section="Comercial"
        title="Orçamentos e pedidos"
        onBack={() => router.navigate("/more")}
      >
        <View style={{ ...row, alignItems: "stretch" }}>
          <Metric
            icon="cash-coin"
            label="A receber"
            value={q.data ? money(q.data.receber) : "—"}
          />
          <Metric
            icon="box"
            label="Pronto p/ entregar"
            value={String(q.data?.prontos ?? "—")}
          />
          <Metric
            icon="clock-history"
            label="A produzir"
            value={String(q.data?.produzir ?? "—")}
          />
        </View>
        {!archived && (
          <Button label="+ Novo orçamento" onPress={() => select("new")} />
        )}
        <View style={{ ...row, alignItems: "center" }}>
          {["Ativos", "Arquivados"].map((s, i) => (
            <Chip
              key={s}
              secondary
              selected={archived === !!i}
              label={s}
              onPress={() => {
                archive(!!i);
                setPage(0);
                setConfirm(undefined);
              }}
            />
          ))}
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrar orçamentos"
            onPress={() => {
              setDraftStatuses(selectedStatuses);
              setFiltersOpen(true);
            }}
            style={{
              width: 42,
              height: 42,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 12,
              backgroundColor: t.surface,
            }}
          >
            <View style={{ gap: 4 }}>
              {[16, 11, 6].map((width) => (
                <View
                  key={width}
                  style={{
                    height: 2,
                    width,
                    borderRadius: 1,
                    backgroundColor: t.primaryText,
                  }}
                />
              ))}
            </View>
            {selectedStatuses.length > 0 && (
              <View
                style={{
                  position: "absolute",
                  right: 4,
                  top: 4,
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: t.primary,
                }}
              />
            )}
          </Pressable>
        </View>
        <Modal
          visible={filtersOpen}
          transparent
          animationType="slide"
          onRequestClose={() => setFiltersOpen(false)}
        >
          <View
            style={{
              flex: 1,
              justifyContent: "flex-end",
              backgroundColor: "rgba(32,22,52,0.46)",
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar filtros"
              onPress={() => setFiltersOpen(false)}
              style={{ flex: 1 }}
            />
            <View
              style={{
                backgroundColor: t.surface,
                borderTopLeftRadius: 22,
                borderTopRightRadius: 22,
                padding: 18,
                gap: 8,
                maxHeight: "80%",
              }}
            >
              <View style={{ ...row, justifyContent: "space-between" }}>
                <Body strong>Filtrar por situação</Body>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Fechar filtros"
                  onPress={() => setFiltersOpen(false)}
                  hitSlop={8}
                >
                  <Text style={{ color: t.muted, fontSize: 24 }}>×</Text>
                </Pressable>
              </View>
              <ScrollView contentContainerStyle={{ gap: 4 }}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: draftStatuses.length === 0 }}
                  onPress={() => setDraftStatuses([])}
                  style={{ ...row, minHeight: 46, paddingHorizontal: 8 }}
                >
                  <Text
                    style={{ color: t.primaryText, fontSize: 18, width: 24 }}
                  >
                    {draftStatuses.length === 0 ? "✓" : "○"}
                  </Text>
                  <Body>Todos</Body>
                </Pressable>
                {filters.map(([key, label]) => {
                  const checked = draftStatuses.includes(key);
                  return (
                    <Pressable
                      key={key}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked }}
                      onPress={() =>
                        setDraftStatuses((current) =>
                          checked
                            ? current.filter((item) => item !== key)
                            : [...current, key],
                        )
                      }
                      style={{ ...row, minHeight: 46, paddingHorizontal: 8 }}
                    >
                      <Text
                        style={{
                          color: checked ? t.primary : t.muted,
                          fontSize: 18,
                          width: 24,
                        }}
                      >
                        {checked ? "✓" : "○"}
                      </Text>
                      <Body>{label}</Body>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <View style={row}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Limpar"
                    variant="secondary"
                    onPress={() => setDraftStatuses([])}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Aplicar"
                    onPress={() => {
                      setSelectedStatuses(draftStatuses);
                      setPage(0);
                      setFiltersOpen(false);
                      setConfirm(undefined);
                    }}
                  />
                </View>
              </View>
            </View>
          </View>
        </Modal>
        {!!error && <Notice message={error} />}
        {q.loading ? (
          <ActivityIndicator />
        ) : q.error ? (
          <Notice message={q.error} onRetry={q.retry} />
        ) : (
          <>
            {q.data?.itens.map((s) => {
              const operational = ["APROVADO", "PRONTO", "ENTREGUE"].includes(
                  s.status,
                ),
                pay =
                  (s.status === "ENTREGUE" ||
                    s.situacao === "Pronto para entregar") &&
                  !s.pago &&
                  !archived;
              const steps = [
                s.status !== "RASCUNHO",
                operational,
                s.status === "ENTREGUE",
                s.pago,
              ];
              return (
                <Card key={s.id}>
                  <View
                    style={{
                      ...row,
                      justifyContent: "space-between",
                      flexWrap: "wrap",
                    }}
                  >
                    <Text
                      style={{
                        color: s.pago ? t.success : t.primaryText,
                        backgroundColor: s.pago ? "#e4f2e9" : t.selectionTint,
                        paddingHorizontal: 9,
                        paddingVertical: 4,
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                    >
                      {s.situacao}
                      {s.pago ? " · Pago" : ""}
                    </Text>
                    <Body muted>
                      #{s.codigo} ·{" "}
                      {s.criado.slice(0, 10).split("-").reverse().join("/")}
                    </Body>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => openDetails(s.id)}
                  >
                    <Body strong>{s.titulo}</Body>
                  </Pressable>
                  <View style={row}>
                    <View style={{ flex: 1 }}>
                      <Body muted>{s.cliente || "Cliente a informar"}</Body>
                    </View>
                    <Body strong>{money(s.total)}</Body>
                  </View>
                  <View style={row}>
                    {["Proposta", "Produção", "Entrega", "Pago"].map(
                      (label, i) => (
                        <View key={label} style={{ flex: 1 }}>
                          <View
                            style={{
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: steps[i]
                                ? t.header
                                : t.selectionTint,
                            }}
                          />
                        </View>
                      ),
                    )}
                  </View>
                  <View style={row}>
                    <View style={{ flex: 1 }}>
                      <Body muted>
                        {s.situacao} · {steps.filter(Boolean).length} de 4 ·{" "}
                        {s.pago ? "pagamento registrado" : "pagamento pendente"}
                      </Body>
                    </View>
                    <View style={{ flex: 1.3 }}>
                      <Button
                        variant="secondary"
                        label={
                          pay
                            ? "Registrar pagamento"
                            : s.status === "RASCUNHO" && !archived
                              ? "Editar proposta"
                              : "Ver proposta"
                        }
                        onPress={() =>
                          pay
                            ? setConfirm({ s, action: "pagar" })
                            : select(s.id)
                        }
                      />
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        archived ? "Restaurar proposta" : "Arquivar proposta"
                      }
                      style={{ padding: 8 }}
                      onPress={() =>
                        setConfirm({
                          s,
                          action: archived ? "restaurar" : "arquivar",
                        })
                      }
                    >
                      <Icon name="box" color={t.primaryText} />
                    </Pressable>
                  </View>
                  {confirm?.s.id === s.id && (
                    <>
                      <Body>
                        {confirm.action === "pagar"
                          ? "Registrar o pagamento desta proposta?"
                          : archived
                            ? "Restaurar a proposta?"
                            : "Arquivar a proposta?"}
                      </Body>
                      <Button
                        label="Confirmar"
                        busy={busy}
                        onPress={() => void act()}
                      />
                      <Button
                        label="Voltar"
                        variant="ghost"
                        onPress={() => setConfirm(undefined)}
                      />
                    </>
                  )}
                </Card>
              );
            })}
            {!q.data?.itens.length && (
              <Card>
                <Body muted>Nenhum orçamento neste filtro.</Body>
              </Card>
            )}
            <Pagination
              page={page}
              total={q.data?.total ?? 0}
              size={q.data?.tamanho}
              onPage={setPage}
            />
          </>
        )}
      </ModuleScreen>
    </View>
  );
}
