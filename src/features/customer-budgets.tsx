import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from "react-native";
import {
  Button,
  Body,
  Card,
  Heading,
  Notice,
  Pagination,
} from "@/components/ui";
import type { components } from "@/api/schema";
import { dateTime, reais } from "@/features/format";
import { statusBadge } from "@/features/budget-ui";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";

export function CustomerBudgets({ id }: { id: string }) {
  const mobile = useWindowDimensions().width < 900;
  const t = useTheme();
  const [archived, setArchived] = useState(false);
  const [page, setPage] = useState(0);
  const { data, loading, error, retry } = useApiQuery<
    components["schemas"]["PaginaResponseOrcamentoResumo"]
  >(
    `/clientes/${encodeURIComponent(id)}/orcamentos?arquivados=${archived}&pagina=${page}`,
    true,
  );
  function selectArchive(value: boolean) {
    setArchived(value);
    setPage(0);
  }
  return (
    <View style={{ gap: 12 }}>
      {mobile ? <Body strong>Orçamentos</Body> : <Heading title="Orçamentos" />}
      <View style={{ flexDirection: "row", padding: 3, borderRadius: 11, backgroundColor: t.accentTint, gap: 3 }}>
        {[{ label: "Atuais", value: false }, { label: "Arquivados", value: true }].map(({ label, value }) => <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: archived === value }} onPress={() => selectArchive(value)} style={{ flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: archived === value ? 1 : 0, borderColor: t.border, backgroundColor: archived === value ? t.surface : "transparent" }}><Text style={{ color: t.text, fontSize: 12, fontWeight: archived === value ? "700" : "500" }}>{label}</Text></Pressable>)}
      </View>
      {loading && !data ? (
        <ActivityIndicator color={t.primaryText} />
      ) : error ? (
        <Notice message={error} onRetry={retry} />
      ) : (
        <>
          {data?.itens?.length ? (
            <Card style={{ gap: 0, paddingVertical: 0, paddingHorizontal: 10 }}>
              {data.itens.map((budget, index) => {
                const badge = statusBadge(budget.situacao || "", false, t);
                return <Pressable key={budget.id} accessibilityRole="button" onPress={() => budget.id && router.push({ pathname: "/budgets", params: { id: budget.id } })} style={{ minHeight: 63, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderBottomWidth: index === data.itens!.length - 1 ? 0 : 1, borderColor: t.border }}>
                  <View style={{ flex: 1, minWidth: 0, gap: 1 }}><Body strong>{budget.titulo}</Body><Body muted>#{budget.codigo} · {dateTime(budget.criadoEm)}</Body></View>
                  <View style={{ alignItems: "flex-end", gap: 3 }}><Body strong>{reais(budget.total)}</Body><Text style={{ color: badge.fg, backgroundColor: badge.bg, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, fontSize: 10 }}>{budget.situacao}</Text></View>
                </Pressable>;
              })}
            </Card>
          ) : (
            <Card>
              <Body muted>
                {archived
                  ? "Nenhum orçamento arquivado para este cliente."
                  : "Nenhum orçamento atual para este cliente."}
              </Body>
            </Card>
          )}
          {data?.tamanho && (page > 0 || (data.total ?? 0) > data.tamanho) ? (
            <Pagination
              disabled={loading}
              page={page}
              total={data.total ?? 0}
              size={data.tamanho}
              onPage={setPage}
            />
          ) : null}
        </>
      )}
    </View>
  );
}
