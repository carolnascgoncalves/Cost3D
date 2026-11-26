import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/provider";
import { Body, Button, Card, Chip, Notice, Pagination } from "@/components/ui";
import { ModuleScreen } from "@/components/module-screen";
import { Icon } from "@/components/icon";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import { BudgetWizard } from "@/features/budget-wizard";
import { Metric, Avatar, money, row, type Summary } from "@/features/budget-ui";
type List = {
  itens: Summary[];
  total: number;
  tamanho: number;
  receber: number;
  prontos: number;
  produzir: number;
};
const filters = [
  ["", "Todos"],
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
    [filter, filterBy] = useState(""),
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
          (filter ? "&status=" + filter : ""),
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
        <View style={row}>
          {["Ativos", "Arquivados"].map((s, i) => (
            <View key={s} style={{ flex: 1 }}>
              <Button
                label={s}
                variant={archived === !!i ? "primary" : "secondary"}
                onPress={() => {
                  archive(!!i);
                  setPage(0);
                  setConfirm(undefined);
                }}
              />
            </View>
          ))}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {filters.map(([key, label]) => (
            <Chip
              key={key}
              secondary
              selected={key === filter}
              label={label}
              onPress={() => {
                filterBy(key);
                setPage(0);
                setConfirm(undefined);
              }}
            />
          ))}
        </ScrollView>
        {!archived && (
          <Button label="+ Novo orçamento" onPress={() => select("new")} />
        )}
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
                    <Avatar name={s.cliente} />
                    <View style={{ flex: 1 }}>
                      <Body>{s.cliente || "Cliente a informar"}</Body>
                    </View>
                    <Body strong>{money(s.total)}</Body>
                  </View>
                  <View style={row}>
                    {["Proposta", "Produção", "Entrega", "Pago"].map(
                      (label, i) => (
                        <View key={label} style={{ flex: 1, gap: 3 }}>
                          <View
                            style={{
                              height: 5,
                              borderRadius: 3,
                              backgroundColor: steps[i]
                                ? t.header
                                : t.selectionTint,
                            }}
                          />
                          <Text style={{ color: t.muted, fontSize: 11 }}>
                            {label}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                  <View style={row}>
                    <View style={{ flex: 1 }}>
                      <Body muted>
                        {s.pago ? "Pagamento registrado" : "Pagamento pendente"}
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
