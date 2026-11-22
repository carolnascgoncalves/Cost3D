import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { components } from "@/api/schema";
import { ModuleScreen } from "@/components/module-screen";
import { Body, Button, Card, Chip, Notice, layout } from "@/components/ui";
import { decimal, quantity, reais } from "@/features/format";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";

type Point = components["schemas"]["PontoLucro"];

function ProfitChart({ points }: { points: Point[] }) {
  const t = useTheme();
  const [index, setIndex] = useState(points.length - 1);
  const selected = points[index] ?? points.at(-1);
  const numbers = points.map((p) => Number(p.valor));
  const high = Math.max(0, ...numbers),
    low = Math.min(0, ...numbers);
  const scale = 100 / (high - low || 1);
  const baseline = high || low ? high * scale : 100;
  return (
    <Card>
      <Body>Lucro líquido estimado</Body>
      {points.length > 0 ? (
        <>
          <Body muted>
            {selected?.data} · {reais(selected?.valor)}
          </Body>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={points.length > 12}
            contentContainerStyle={{ flexGrow: 1 }}
          >
            <View
              style={{
                flexDirection: "row",
                flex: 1,
                minWidth: points.length * 24,
                height: 108,
              }}
            >
              <View
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: baseline,
                  height: 1,
                  backgroundColor: t.border,
                }}
              />
              {points.map((p, i) => {
                const n = numbers[i];
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: i === index }}
                    accessibilityLabel={p.data + ", " + reais(p.valor)}
                    key={p.data}
                    onPress={() => setIndex(i)}
                    style={{ flex: 1, minWidth: 24, height: 108 }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        left: 4,
                        right: 4,
                        top: n > 0 ? baseline - n * scale : baseline,
                        height: Math.max(n === 0 ? 1 : 2, Math.abs(n) * scale),
                        borderRadius: 3,
                        opacity: i === index ? 1 : 0.7,
                        backgroundColor: n < 0 ? t.danger : t.primary,
                      }}
                    />
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Body muted>{points[0].data}</Body>
            <Body muted>{points.at(-1)?.data}</Body>
          </View>
        </>
      ) : (
        <Body muted>Nenhum resultado neste período.</Body>
      )}
    </Card>
  );
}

function Meter({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Text style={{ color: t.text, flex: 1 }}>{label}</Text>
        <Text style={{ color: t.muted }}>{value}</Text>
      </View>
      <View
        style={{
          height: 8,
          borderRadius: 4,
          backgroundColor: t.accentTint,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            height: 8,
            width: `${Math.max(0, Math.min(100, percent))}%`,
            backgroundColor: t.primary,
            borderRadius: 4,
          }}
        />
      </View>
    </View>
  );
}

export default function Dashboard() {
  const t = useTheme(),
    wide = useWindowDimensions().width >= 900;
  const [period, setPeriod] = useState("30");
  const q = useApiQuery<components["schemas"]["DashboardLoja"]>(
    `/dashboard?periodo=${period}`,
  );
  const data = q.data;
  const maxSales = Math.max(
    1,
    ...(data?.plataformas ?? []).map((p) => p.vendas ?? 0),
  );
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
              <Card>
                <Body>Estoque de filamentos</Body>
                {data.estoque?.length ? (
                  data.estoque.map((f, i) => (
                    <Meter
                      key={i}
                      label={f.nome ?? "Filamento"}
                      value={quantity(f.gramas, "g")}
                      percent={f.restante ?? 0}
                    />
                  ))
                ) : (
                  <Body muted>Nenhum filamento cadastrado.</Body>
                )}
              </Card>
            </>
          )
        )}
      </ModuleScreen>
    );
  }
  return (
    <ModuleScreen section="Visão geral" title="Dashboard">
      <View style={layout.row}>
        {[
          ["7", "7 dias"],
          ["30", "30 dias"],
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
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              ["Lucro líquido estimado", reais(data.lucro)],
              ["Unidades vendidas", String(data.vendas ?? 0)],
              ["Horas impressas", decimal(data.horas, 1) + " h"],
              ["Filamento usado", decimal(data.filamentoKg, 2) + " kg"],
            ].map(([label, value]) => (
              <Card
                key={label}
                style={{ width: wide ? "23%" : "47%", flexGrow: 1 }}
              >
                <Body muted>{label}</Body>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: "700",
                    color:
                      label === "Lucro líquido estimado" &&
                      Number(data.lucro) < 0
                        ? t.danger
                        : t.text,
                  }}
                >
                  {value}
                </Text>
              </Card>
            ))}
          </View>
          <ProfitChart key={period} points={data.serie ?? []} />
          <View style={{ flexDirection: wide ? "row" : "column", gap: 12 }}>
            <Card style={wide ? { flex: 1 } : undefined}>
              <Body>Vendas por plataforma</Body>
              {data.plataformas?.length ? (
                data.plataformas.map((p) => (
                  <Meter
                    key={p.nome}
                    label={p.nome ?? "Sem plataforma"}
                    value={`${p.vendas} un.`}
                    percent={(100 * (p.vendas ?? 0)) / maxSales}
                  />
                ))
              ) : (
                <Body muted>Nenhuma venda no período.</Body>
              )}
            </Card>
            <Card style={wide ? { flex: 1 } : undefined}>
              <Body>Estoque de filamentos</Body>
              {data.estoque?.length ? (
                data.estoque.map((f, i) => (
                  <Meter
                    key={i}
                    label={f.nome ?? "Filamento"}
                    value={quantity(f.gramas, "g")}
                    percent={f.restante ?? 0}
                  />
                ))
              ) : (
                <Body muted>Nenhum filamento cadastrado.</Body>
              )}
            </Card>
          </View>
          <Card>
            <Body>Fluxo de produção</Body>
            <Body muted>
              {data.calculadas} calculadas · {data.produzidas} produzidas ·{" "}
              {data.vendidas} vendidas
            </Body>
          </Card>
          <Card>
            <Body>Para onde vai o custo</Body>
            {data.custos?.some((c) => Number(c.valor) !== 0) ? (
              data.custos.map((c) => (
                <Meter
                  key={c.nome}
                  label={c.nome ?? "Custo"}
                  value={reais(c.valor)}
                  percent={c.percentual ?? 0}
                />
              ))
            ) : (
              <Body muted>Nenhum custo de produção neste período.</Body>
            )}
          </Card>
          <Button
            label="Indicadores e cadastros"
            variant="secondary"
            onPress={() => router.setParams({ visao: "cadastros" })}
          />
        </>
      ) : null}
    </ModuleScreen>
  );
}
