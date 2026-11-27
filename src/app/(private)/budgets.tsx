import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useTheme } from "@/theme/provider";
import { Body, Button, Card, Chip, Notice, Pagination } from "@/components/ui";
import { ModuleScreen } from "@/components/module-screen";
import { Icon } from "@/components/icon";
import { useApiQuery } from "@/hooks/use-api-query";
import { BudgetWizard } from "@/features/budget-wizard";
import { money, row, statusBadge, type Summary } from "@/features/budget-ui";
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
  ["ENVIADO", "Enviado"],
  ["APROVADO", "Produzido"],
  ["PRONTO", "Pronto"],
];
export default function Budgets() {
  const t = useTheme(),
    params = useLocalSearchParams<{ id?: string }>(),
    [id, select] = useState(params.id || ""),
    [details, showDetails] = useState(false),
    [archived, archive] = useState(false),
    [selectedStatuses, setSelectedStatuses] = useState<string[]>([]),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const q = useApiQuery<List>(
    id
      ? null
      : "/orcamentos?pagina=" +
          page +
          "&arquivados=" +
          archived +
          "&busca=" + encodeURIComponent(search) +
            (selectedStatuses.length
            ? "&status=" + selectedStatuses.join(",")
            : ""),
  );
  function openDetails(id: string) {
    showDetails(true);
    select(id);
  }
  function close() {
    showDetails(false);
    select("");
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
        <Card style={{ gap: 2, padding: 16, backgroundColor: t.surface }}>
          <Body muted>A receber</Body>
          <Text style={{ color: t.text, fontSize: 26, lineHeight: 30, fontWeight: "700" }}>{q.data ? money(q.data.receber) : "—"}</Text>
          <View style={{ ...row, flexWrap: "wrap", marginTop: 3 }}>
            <Text style={{ color: "#49624B", backgroundColor: "#F0F4EF", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 13 }}>{q.data?.prontos ?? 0} prontos para entrega</Text>
            <Text style={{ color: "#71603F", backgroundColor: "#F6F1E8", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, fontSize: 13 }}>{q.data?.produzir ?? 0} a produzir</Text>
          </View>
        </Card>
        <View style={{ ...row, alignItems: "stretch" }}>
          <View style={{ flex: 1, minHeight: 36, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: t.border, borderRadius: 10, backgroundColor: t.surface }}>
            <Icon name="search" color={t.muted} size={17} />
            <TextInput accessibilityLabel="Buscar cliente ou peça" placeholder="Buscar cliente ou peça" placeholderTextColor={t.muted} value={search} onChangeText={(value) => { setSearch(value); setPage(0); }} style={{ flex: 1, color: t.text, fontSize: 14 }} />
          </View>
          {!archived && <Pressable accessibilityRole="button" onPress={() => select("new")} style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 13, borderRadius: 10, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.75 : 1 })}><Text style={{ color: t.onPrimary, fontSize: 13, fontWeight: "700" }}>＋ Novo</Text></Pressable>}
        </View>
        <View style={{ ...row, alignItems: "center", gap: 14 }}>
          {["Ativos", "Arquivados"].map((s, i) => <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected: archived === !!i }} onPress={() => { archive(!!i); setPage(0); }} style={{ minHeight: 34, justifyContent: "center", borderBottomWidth: 2, borderColor: archived === !!i ? t.primary : "transparent" }}><Text style={{ color: archived === !!i ? t.primaryText : t.muted, fontSize: 13, fontWeight: archived === !!i ? "700" : "400" }}>{s}</Text></Pressable>)}
        </View>
        <View style={{ ...row, flexWrap: "wrap", gap: 7 }}>
          {[["", "Todos"], ...filters].map(([key, label]) => <Chip key={key} secondary selected={key ? selectedStatuses.includes(key) : selectedStatuses.length === 0} label={label} onPress={() => { if (!key) setSelectedStatuses([]); else setSelectedStatuses(current => current.includes(key) ? current.filter(x => x !== key) : [...current, key]); setPage(0); }} />)}
        </View>
        {q.loading ? (
          <ActivityIndicator />
        ) : q.error ? (
          <Notice message={q.error} onRetry={q.retry} />
        ) : (
          <>
            {q.data?.itens.map((s) => {
              const progress = s.pago ? 4 : ({ RASCUNHO: 0, ENVIADO: 1, APROVADO: 2, PRONTO: 3, ENTREGUE: 4 } as Record<string, number>)[s.status] ?? 0;
              const phase = s.status === "ENVIADO" ? "Aguardando aprovação" : s.status === "RASCUNHO" ? "Rascunho" : s.pago ? "Pagamento efetuado" : s.status === "ENTREGUE" ? "Pagamento pendente" : s.situacao;
              const badge = statusBadge(s.status, s.pago, t);
              return (
                <Card key={s.id} style={{ padding: 0, gap: 0 }}>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Abrir proposta de ${s.cliente || "cliente"}`} onPress={() => openDetails(s.id)} style={({ pressed }) => ({ gap: 8, padding: 12, borderRadius: 14, opacity: pressed ? 0.72 : 1 })}>
                    <View style={{ ...row, justifyContent: "space-between" }}>
                      <Text style={{ color: badge.fg, backgroundColor: badge.bg, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8, fontSize: 12 }}>{s.status === "APROVADO" ? "A produzir" : s.status === "PRONTO" ? "Pronto" : s.situacao}{s.pago ? " · Pago" : ""}</Text>
                      <Text style={{ color: t.muted, fontSize: 11 }}>#{s.codigo} · {new Date(s.criado).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(" de ", " ")}</Text>
                    </View>
                    <Body strong>{s.cliente || "Cliente a informar"}</Body>
                    <Body muted>{s.pecasResumo || s.titulo}</Body>
                    <View style={{ ...row, gap: 5 }}>
                      {[0, 1, 2, 3].map((i) => <View key={i} style={{ flex: 1, height: 4, borderRadius: 3, backgroundColor: i < progress ? t.primary : t.selectionTint }} />)}
                    </View>
                    <View style={{ ...row, justifyContent: "space-between" }}>
                      <Text style={{ color: t.muted, fontSize: 12, flex: 1 }}>{phase}</Text>
                      <Text style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>{money(s.total)}</Text>
                    </View>
                  </Pressable>
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
