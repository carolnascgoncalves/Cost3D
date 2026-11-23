import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { components } from "@/api/schema";
import { ModuleScreen } from "@/components/module-screen";
import { Body, Button, Card, Chip, Notice, layout } from "@/components/ui";
import { decimal, reais } from "@/features/format";
import { useApiQuery } from "@/hooks/use-api-query";
import { useStoreName, useTheme } from "@/theme/provider";

import {
  ProfitChart,
  PlatformChart,
  CategoryChart,
  FilamentStock,
  ProductionFlow,
} from "@/components/dashboard-charts";

export default function Dashboard() {
  const t = useTheme(),
    wide = useWindowDimensions().width >= 900;
  const name = useStoreName();
  const [expanded, setExpanded] = useState(false);
  const [period, setPeriod] = useState("30");
  const q = useApiQuery<components["schemas"]["DashboardLoja"]>(
    `/dashboard?periodo=${period}`,
  );
  const data = q.data;
  const { visao } = useLocalSearchParams<{ visao?: string }>();
  if (visao === "cadastros") {
    const sections = [
      ["pecas", "Peças"],
      ["filamentos", "Filamentos"],
      ["impressoras", "Impressoras"],
      ["embalagens", "Embalagens"],
      ["clientes", "Clientes"],
    ] as const;
    return (
      <ModuleScreen section="Visão geral" title="Indicadores e cadastros">
        <Button
          label="Voltar ao dashboard"
          variant="ghost"
          onPress={() => router.setParams({ visao: "resumo" })}
        />
        {q.loading ? (
          <ActivityIndicator color={t.primaryText} />
        ) : q.error ? (
          <Notice message={q.error} onRetry={q.retry} />
        ) : (
          data && (
            <>
              {sections.map(([key, label]) => (
                <Pressable
                  key={key}
                  accessibilityRole="link"
                  accessibilityLabel={label + ", " + data.cadastros?.[key]}
                  onPress={() =>
                    key === "clientes"
                      ? router.navigate("/customers")
                      : router.navigate({
                          pathname: "/catalog",
                          params: { categoria: key },
                        })
                  }
                >
                  <Card
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                    }}
                  >
                    <Body>{label}</Body>
                    <Body>{data.cadastros?.[key]}</Body>
                  </Card>
                </Pressable>
              ))}
              <FilamentStock items={data.estoque ?? []} />
            </>
          )
        )}
      </ModuleScreen>
    );
  }
  return (
    <ModuleScreen
      lightHeader
      section="Painel principal"
      title={name ? "Resultados de " + name : "Resultados da loja"}
    >
      <Body muted>Lucro, vendas e produção no período.</Body>
      <View style={layout.row}>
        {[
          ["30", "30 dias"],
          ["90", "90 dias"],
          ["tudo", "Tudo"],
        ].map(([key, label]) => (
          <Chip
            key={key}
            selected={period === key}
            onPress={() => setPeriod(key)}
            label={label}
          />
        ))}
      </View>
      {q.loading ? (
        <ActivityIndicator color={t.primaryText} />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : data ? (
        <>
          {
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {[
                ["Lucro líquido estimado", reais(data.lucro)],
                ["Vendas da loja", String(data.vendas ?? 0)],
                ["Horas imprimindo", decimal(data.horas, 1) + " h"],
                ["Filamento usado", decimal(data.filamentoKg, 2) + " kg"],
              ].map(([label, value]) => (
                <Card
                  key={label}
                  style={{
                    width: wide ? "23%" : "47%",
                    flexGrow: 1,
                    backgroundColor: label.startsWith("Lucro")
                      ? t.header
                      : t.surface,
                  }}
                >
                  <Text
                    style={{
                      color: label.startsWith("Lucro") ? t.onPrimary : t.muted,
                      fontSize: 13,
                    }}
                  >
                    {label}
                  </Text>
                  <Text
                    style={{
                      fontSize: 20,
                      fontWeight: "700",
                      color: label.startsWith("Lucro") ? t.onPrimary : t.text,
                    }}
                  >
                    {value}
                  </Text>
                </Card>
              ))}
            </View>
          }
          <ProfitChart
            key={period}
            points={data.serie ?? []}
            monthly={period === "tudo"}
            change={data.variacaoLucro}
          />
          <Button
            variant="secondary"
            label={
              expanded
                ? "Recolher indicadores"
                : "Ver mais indicadores e cadastros"
            }
            onPress={() => setExpanded(!expanded)}
          />
          {expanded && (
            <>
              <View style={{ flexDirection: wide ? "row" : "column", gap: 12 }}>
                <View style={wide ? { flex: 1 } : undefined}>
                  <PlatformChart data={data} />
                </View>
                <View style={wide ? { flex: 1 } : undefined}>
                  <ProductionFlow data={data} />
                </View>
              </View>
              <View style={{ flexDirection: wide ? "row" : "column", gap: 12 }}>
                <View style={wide ? { flex: 1 } : undefined}>
                  <FilamentStock items={data.estoque ?? []} />
                </View>
                <View style={wide ? { flex: 1 } : undefined}>
                  <CategoryChart items={data.categorias ?? []} />
                </View>
              </View>
            </>
          )}
          {expanded && (
            <Button
              variant="secondary"
              label="Cálculos recentes"
              onPress={() =>
                router.push({
                  pathname: "/calculate",
                  params: { modo: "historico" },
                })
              }
            />
          )}
          {expanded && (
            <Button
              label="Ver cadastros"
              variant="secondary"
              onPress={() => router.setParams({ visao: "cadastros" })}
            />
          )}
        </>
      ) : null}
    </ModuleScreen>
  );
}
