import { useState } from "react";
import { ActivityIndicator, View, useWindowDimensions } from "react-native";
import {
  Badge,
  ValueRow,
  Body,
  Card,
  Chip,
  Heading,
  Notice,
  Pagination,
  layout,
} from "@/components/ui";
import type { components } from "@/api/schema";
import { dateTime, reais } from "@/features/format";
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
  );
  function selectArchive(value: boolean) {
    setArchived(value);
    setPage(0);
  }
  return (
    <View style={{ gap: 12 }}>
      {!mobile && <Heading title="Orçamentos" />}
      <View style={layout.row}>
        <Chip
          label="Atuais"
          selected={!archived}
          onPress={() => selectArchive(false)}
        />
        <Chip
          label="Arquivados"
          selected={archived}
          onPress={() => selectArchive(true)}
        />
      </View>
      {loading ? (
        <ActivityIndicator color={t.primaryText} />
      ) : error ? (
        <Notice message={error} onRetry={retry} />
      ) : (
        <>
          {data?.itens?.length ? (
            data.itens.map((budget) => (
              <Card key={budget.id}>
                {mobile ? (
                  <>
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <View style={{ flex: 1, gap: 4 }}>
                        <Body muted>#{budget.codigo}</Body>
                        <Body strong>{budget.titulo}</Body>
                      </View>
                      {!!budget.situacao && <Badge>{budget.situacao}</Badge>}
                    </View>
                    <Body muted>{dateTime(budget.criadoEm)}</Body>
                    <ValueRow label="Total" value={reais(budget.total)} />
                  </>
                ) : (
                  <>
                    <Body>
                      #{budget.codigo} · {budget.titulo}
                    </Body>
                    <Body muted>
                      {budget.situacao} · {dateTime(budget.criadoEm)}
                    </Body>
                    <Body>Total · {reais(budget.total)}</Body>
                  </>
                )}
              </Card>
            ))
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
