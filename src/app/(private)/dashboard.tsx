import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { components } from "@/api/schema";
import { ModuleScreen } from "@/components/module-screen";
import { Icon } from "@/components/icon";
import { Body, Button, Card, Notice } from "@/components/ui";
import { decimal, reais } from "@/features/format";
import { useApiQuery } from "@/hooks/use-api-query";
import { useStoreName, useTheme } from "@/theme/provider";
import {
  ProfitChart,
  PlatformChart,
  CategoryChart,
  FilamentStock,
  ProductionFlow,
  ProductionRhythm,
  ExtraCostProgress,
} from "@/components/dashboard-charts";

type DashboardData = components["schemas"]["DashboardLoja"];
type ExtraCost = components["schemas"]["CustoResumo"];
const periods = [
  ["30", "30 dias"],
  ["90", "90 dias"],
  ["tudo", "Tudo"],
] as const;
const tabs = [
  ["resumo", "Resumo"],
  ["vendas", "Vendas"],
  ["producao", "Produção"],
] as const;

function Segmented({
  value,
  items,
  onChange,
}: {
  value: string;
  items: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  const t = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        padding: 3,
        borderRadius: 12,
        backgroundColor: t.accentTint,
        gap: 3,
      }}
    >
      {items.map(([key, label]) => (
        <Pressable
          key={key}
          accessibilityRole="button"
          accessibilityState={{ selected: value === key }}
          onPress={() => onChange(key)}
          style={{
            flex: 1,
            minHeight: 38,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 9,
            borderWidth: value === key ? 1 : 0,
            borderColor: t.border,
            backgroundColor: value === key ? t.surface : "transparent",
          }}
        >
          <Text
            style={{
              color: value === key ? t.text : t.muted,
              fontSize: 13,
              fontWeight: value === key ? "700" : "500",
            }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function MiniTrend({
  points,
}: {
  points: NonNullable<DashboardData["serie"]>;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const values = points.slice(-30).map((p) => Number(p.valor ?? 0));
  const low = Math.min(0, ...values),
    high = Math.max(1, ...values);
  const step = width / Math.max(1, values.length - 1);
  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height: 42, overflow: "hidden" }}
    >
      {width > 0 &&
        values.slice(1).map((v, index) => {
          const x1 = index * step,
            x2 = (index + 1) * step;
          const y1 = 37 - ((values[index] - low) / (high - low)) * 30,
            y2 = 37 - ((v - low) / (high - low)) * 30;
          const dx = x2 - x1,
            dy = y2 - y1,
            length = Math.hypot(dx, dy);
          return (
            <View
              key={index}
              style={{
                position: "absolute",
                left: x1 + (dx - length) / 2,
                top: (y1 + y2) / 2,
                width: length + 1,
                height: 2.5,
                backgroundColor: t.onPrimary,
                borderRadius: 2,
                transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
              }}
            />
          );
        })}
    </View>
  );
}

function Metric({
  icon,
  label,
  value,
  tint,
}: {
  icon: "cash-coin" | "shop" | "printer" | "palette";
  label: string;
  value: string;
  tint: string;
}) {
  const t = useTheme();
  return (
    <Card
      style={{
        flex: 1,
        minWidth: 145,
        padding: 11,
        flexDirection: "row",
        alignItems: "center",
        gap: 9,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 9,
          backgroundColor: tint,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={16} color={t.primaryText} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <Text style={{ color: t.muted, fontSize: 11 }}>{label}</Text>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{ color: t.text, fontSize: 16, fontWeight: "700" }}
        >
          {value}
        </Text>
      </View>
    </Card>
  );
}

export default function Dashboard() {
  const t = useTheme();
  const wide = useWindowDimensions().width >= 900;
  const name = useStoreName();
  const [period, setPeriod] = useState("30");
  const [tab, setTab] = useState("resumo");
  const [periodOpen, setPeriodOpen] = useState(false);
  const q = useApiQuery<DashboardData>(`/dashboard?periodo=${period}`);
  const extraCosts = useApiQuery<ExtraCost[]>("/custos-loja");
  const data = q.data;
  const { visao } = useLocalSearchParams<{ visao?: string }>();
  const periodLabel = periods.find(([key]) => key === period)?.[1] ?? "30 dias";

  const alerts = useMemo(() => {
    const result: {
      icon: string;
      label: string;
      route: () => void;
      color: string;
    }[] = [];
    const lowStock = data?.estoqueCritico;
    const awaitingSale = data?.aguardandoVenda ?? 0;
    if (lowStock)
      result.push({
        icon: "palette",
        label: `${lowStock.nome} acabando · ${decimal(lowStock.estoque, 1)} g restantes`,
        route: () =>
          router.navigate({
            pathname: "/catalog",
            params: { categoria: "filamentos" },
          }),
        color: t.danger,
      });
    if (awaitingSale > 0)
      result.push({
        icon: "box",
        label: `${awaitingSale} ${awaitingSale === 1 ? "peça produzida" : "peças produzidas"} sem venda`,
        route: () => router.navigate("/sales"),
        color: "#B27A10",
      });
    return result;
  }, [data, t.danger]);

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
                  accessibilityLabel={`${label}, ${data.cadastros?.[key]}`}
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
    <>
      <ModuleScreen
        lightHeader
        section="Painel principal"
        title="Resultados"
        titleAccessory={
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Período: ${periodLabel}`}
            onPress={() => setPeriodOpen(true)}
            style={{
              minHeight: 34,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              borderWidth: 1,
              borderColor: t.border,
              backgroundColor: t.surface,
              borderRadius: 18,
              paddingHorizontal: 10,
            }}
          >
            <Icon name="calendar3" size={13} color={t.text} />
            <Text style={{ color: t.text, fontSize: 12, fontWeight: "600" }}>
              {periodLabel}
            </Text>
            <View
              style={{ transform: [{ rotate: "90deg" }, { translateY: -1 }] }}
            >
              <Icon name="chevron-right" size={11} color={t.muted} />
            </View>
          </Pressable>
        }
      >
        {!!name && <Body muted>{name}</Body>}
        <Segmented value={tab} items={tabs} onChange={setTab} />
        {q.loading ? (
          <ActivityIndicator color={t.primaryText} />
        ) : q.error ? (
          <Notice message={q.error} onRetry={q.retry} />
        ) : data ? (
          tab === "resumo" ? (
            <>
              <Card
                style={{
                  backgroundColor: t.header,
                  borderColor: t.header,
                  gap: 3,
                  padding: 14,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.onPrimary, fontSize: 12 }}>
                      Lucro líquido estimado
                    </Text>
                    <Text
                      adjustsFontSizeToFit
                      numberOfLines={1}
                      style={{
                        color: t.onPrimary,
                        fontSize: 29,
                        fontWeight: "700",
                      }}
                    >
                      {reais(data.lucro)}
                    </Text>
                  </View>
                  {data.serie?.length ? (
                    <Text
                      numberOfLines={1}
                      style={{
                        color: t.onPrimary,
                        fontSize: 10,
                        backgroundColor: "#ffffff26",
                        borderRadius: 6,
                        paddingHorizontal: 7,
                        paddingVertical: 4,
                      }}
                    >
                      ☆ Melhor dia{" "}
                      {reais(
                        Math.max(
                          ...data.serie.map((p) => Number(p.valor ?? 0)),
                        ).toFixed(2),
                      )}
                    </Text>
                  ) : null}
                </View>
                <MiniTrend points={data.serie ?? []} />
              </Card>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <Metric
                  icon="cash-coin"
                  tint={t.success + "20"}
                  label="A receber"
                  value={reais(String(data.receber ?? 0))}
                />
                <Metric
                  icon="shop"
                  tint={t.selectionTint}
                  label="Vendas"
                  value={String(data.vendas ?? 0)}
                />
                <Metric
                  icon="printer"
                  tint="#B27A1020"
                  label="Impressão"
                  value={`${decimal(data.horas, 1)} h`}
                />
                <Metric
                  icon="palette"
                  tint={t.dangerBackground}
                  label="Filamento"
                  value={`${decimal(data.filamentoKg, 2)} kg`}
                />
              </View>
              <ProfitChart
                title="Lucro por dia"
                points={data.serie ?? []}
                monthly={period === "tudo"}
                change={data.variacaoLucro}
              />
              {alerts.length > 0 && (
                <Card style={{ gap: 0, paddingVertical: 3 }}>
                  {alerts.map((alert, index) => (
                    <Pressable
                      key={alert.label}
                      accessibilityRole="link"
                      onPress={alert.route}
                      style={{
                        minHeight: 42,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 9,
                        borderBottomWidth: index === alerts.length - 1 ? 0 : 1,
                        borderColor: t.border,
                      }}
                    >
                      <Icon
                        name={alert.icon as "palette" | "box"}
                        size={16}
                        color={alert.color}
                      />
                      <Text
                        numberOfLines={2}
                        style={{ flex: 1, color: t.text, fontSize: 13 }}
                      >
                        {alert.label}
                      </Text>
                      <Icon name="chevron-right" size={13} color={t.muted} />
                    </Pressable>
                  ))}
                </Card>
              )}
            </>
          ) : tab === "vendas" ? (
            <>
              <PlatformChart data={data} />
              <CategoryChart items={data.categorias ?? []} />
              {extraCosts.loading ? (
                <ActivityIndicator color={t.primaryText} />
              ) : extraCosts.error ? (
                <Notice message={extraCosts.error} onRetry={extraCosts.retry} />
              ) : (
                <ExtraCostProgress items={extraCosts.data ?? []} />
              )}
            </>
          ) : (
            <>
              <ProductionFlow data={data} />
              <ProductionRhythm
                points={data.ritmoProducao ?? []}
                period={period}
              />
              <FilamentStock items={data.estoque ?? []} />
            </>
          )
        ) : null}
      </ModuleScreen>
      <Modal
        visible={periodOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-start",
            alignItems: "flex-end",
            paddingTop: wide ? 84 : 68,
            paddingHorizontal: 20,
            backgroundColor: "#24183566",
          }}
        >
          <Pressable
            onPress={() => setPeriodOpen(false)}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          <Card style={{ width: 170, gap: 3, padding: 6 }}>
            {periods.map(([key, label]) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityState={{ selected: period === key }}
                onPress={() => {
                  setPeriod(key);
                  setPeriodOpen(false);
                }}
                style={{
                  minHeight: 42,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderRadius: 8,
                  backgroundColor:
                    period === key ? t.accentTint : "transparent",
                }}
              >
                <Text
                  style={{
                    color: t.text,
                    fontWeight: period === key ? "700" : "400",
                  }}
                >
                  {label}
                </Text>
                {period === key && (
                  <Text style={{ color: t.primaryText, fontWeight: "700" }}>
                    ✓
                  </Text>
                )}
              </Pressable>
            ))}
          </Card>
        </View>
      </Modal>
    </>
  );
}
