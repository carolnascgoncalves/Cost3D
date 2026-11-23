import { Fragment, useMemo, useState } from "react";
import { router } from "expo-router";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import type { components } from "@/api/schema";
import { Body, Card } from "./ui";
import { decimal, reais } from "@/features/format";
import { readable } from "@/theme/colors";
import { useTheme } from "@/theme/provider";

type Schema = components["schemas"];
type Panel = Schema["DashboardLoja"];

const platformTones: Record<string, string> = {
  "--dashboard-tiktok": "#453267",
  "--dashboard-shopee": "#7963ab",
  "--dashboard-mercado-livre": "#655594",
  "--dashboard-outro": "#9184a5",
  "--dashboard-sem-plataforma": "#ccc4d8",
};
const tone = (key?: string) => platformTones[key ?? ""] ?? "#9184a5";

function Caption({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 12, color: t.muted }}>{children}</Text>;
}

// Intersect two half-discs to draw a sector of at most 180 degrees.
function Sector({
  start,
  diameter = 148,
  angle,
  color,
}: {
  start: number;
  diameter?: number;
  angle: number;
  color: string;
}) {
  const r = diameter / 2;
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { transform: [{ rotate: start + "deg" }] },
      ]}
    >
      <View
        style={{
          position: "absolute",
          left: r,
          width: r,
          height: diameter,
          overflow: "hidden",
        }}
      >
        <View
          style={{
            width: diameter,
            height: diameter,
            left: -r,
            transform: [{ rotate: angle + "deg" }],
          }}
        >
          <View
            style={{
              width: r,
              height: diameter,
              backgroundColor: color,
              borderTopLeftRadius: r,
              borderBottomLeftRadius: r,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export function PlatformChart({ data }: { data: Panel }) {
  const t = useTheme(),
    rows = data.plataformas ?? [];
  const magnitude = rows.reduce(
    (sum, p) => sum + Math.abs(Number(p.lucro ?? 0)),
    0,
  );
  const count = rows.reduce((sum, p) => sum + (p.vendas ?? 0), 0);
  let cursor = 0;
  return (
    <Card>
      <Body strong>Vendas 3D por plataforma</Body>
      <Caption>Lucro das impressões 3D por canal</Caption>
      {rows.length ? (
        <>
          <View
            accessible
            accessibilityLabel={
              reais(data.lucroPlataformas) + ", " + count + " vendas"
            }
            style={{
              alignSelf: "center",
              width: 148,
              height: 148,
              borderRadius: 74,
              backgroundColor: magnitude ? t.surface : t.border,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {rows.map((p, i) => {
              const span = magnitude
                  ? (360 * Math.abs(Number(p.lucro ?? 0))) / magnitude
                  : 0,
                start = cursor;
              cursor += span;
              const gap = span >= 359.999 ? 0 : Math.min(1.4, span / 4),
                sweep = span - gap;
              return (
                sweep > 0 && (
                  <Fragment key={i}>
                    <Sector
                      start={start + gap / 2}
                      angle={Math.min(180, sweep)}
                      color={tone(p.cor)}
                    />
                    {sweep > 180 && (
                      <Sector
                        start={start + 180 + gap / 2}
                        angle={sweep - 180}
                        color={tone(p.cor)}
                      />
                    )}
                  </Fragment>
                )
              );
            })}
            <View
              style={{
                width: 104,
                height: 104,
                borderRadius: 52,
                backgroundColor: t.surface,
                alignItems: "center",
                justifyContent: "center",
                paddingHorizontal: 5,
              }}
            >
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ color: t.text, fontWeight: "700", fontSize: 16 }}
              >
                {reais(data.lucroPlataformas)}
              </Text>
              <Caption>
                {count} {count === 1 ? "venda" : "vendas"}
              </Caption>
            </View>
          </View>
          {rows.map((p, i) => (
            <View key={i} style={styles.row}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 3,
                  backgroundColor: tone(p.cor),
                }}
              />
              <Text style={{ flex: 1, color: t.text }}>{p.nome}</Text>
              <Caption>
                {reais(p.lucro)} · {p.vendas}{" "}
                {p.vendas === 1 ? "venda" : "vendas"}
              </Caption>
            </View>
          ))}
        </>
      ) : (
        <Body muted>Nenhuma venda 3D no período.</Body>
      )}
    </Card>
  );
}

export function FilamentStock({ items }: { items: Schema["EstoquePainel"][] }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const { fontScale } = useWindowDimensions();
  const columns = Math.max(
    1,
    Math.min(3, Math.floor(width / (80 * Math.max(1, fontScale)))),
  );
  const size = 52;
  return (
    <Card>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Abrir catálogo de filamentos"
        onPress={() =>
          router.push({
            pathname: "/catalog",
            params: { categoria: "filamentos" },
          })
        }
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 44,
        }}
      >
        <View style={{ flex: 1, gap: 3 }}>
          <Body strong>Estoque de filamentos</Body>
          <Caption>Saldo disponível em cada rolo</Caption>
        </View>
        <Text style={{ fontSize: 20, color: t.primaryText }}>↗</Text>
      </Pressable>
      {items.length ? (
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14 }}
        >
          {items.map((f, i) => {
            const n = Math.max(0, Math.min(100, f.restante ?? 0)),
              angle = n * 3.6;
            const color = n <= 34 ? "#c54c44" : n <= 64 ? "#d5a130" : "#648b70";
            const saldo = decimal(f.gramas, 2) + " g restantes";
            return (
              <View
                key={i}
                accessible
                accessibilityLabel={
                  f.nome + ", " + saldo + ", " + n + "% do rolo"
                }
                style={{
                  width: width ? `${100 / columns}%` : "33.333%",
                  alignItems: "center",
                  paddingHorizontal: 2,
                  gap: 3,
                }}
              >
                <View
                  style={{
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: n === 100 ? color : t.accentTint,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 2,
                  }}
                >
                  {n > 0 && n < 100 && (
                    <Sector
                      diameter={size}
                      start={0}
                      angle={Math.min(180, angle)}
                      color={color}
                    />
                  )}
                  {angle > 180 && n < 100 && (
                    <Sector
                      diameter={size}
                      start={180}
                      angle={angle - 180}
                      color={color}
                    />
                  )}
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: t.surface,
                    }}
                  >
                    <View
                      style={{
                        width: 17,
                        height: 17,
                        borderRadius: 9,
                        borderWidth: 1,
                        borderColor: t.border,
                        backgroundColor: f.cor ?? t.border,
                      }}
                    />
                  </View>
                </View>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: t.text,
                    textAlign: "center",
                  }}
                >
                  {f.nome}
                </Text>
                <Text
                  style={{
                    fontSize: 11,
                    color: n === 0 ? t.danger : t.muted,
                    textAlign: "center",
                  }}
                >
                  {saldo}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Body muted>Nenhum filamento cadastrado.</Body>
      )}
    </Card>
  );
}

export function ProductionFlow({ data }: { data: Panel }) {
  const t = useTheme(),
    values = [data.calculadas ?? 0, data.produzidas ?? 0, data.vendidas ?? 0];
  const colors = ["#534378", "#cdc6e3", "#8174bc"],
    labels = ["Calculados", "Produzidos", "Vendidos"];
  const pending = Math.max(0, values[1] - values[2]);
  return (
    <Card>
      <Body strong>Fluxo de produção</Body>
      <Caption>Impressões 3D calculadas no período</Caption>
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          marginVertical: 5,
        }}
      >
        {values.map((v, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <View style={{ alignItems: "center", paddingTop: 4 }}>
                <Caption>→</Caption>
                <Caption>
                  {values[i - 1]
                    ? Math.round((v * 100) / values[i - 1]) + "%"
                    : "—"}
                </Caption>
              </View>
            )}
            <View style={{ flex: 1, alignItems: "center", gap: 5 }}>
              <View
                style={{
                  minWidth: 44,
                  height: 44,
                  paddingHorizontal: 6,
                  borderRadius: 22,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors[i],
                }}
              >
                <Text style={{ color: readable(colors[i]), fontWeight: "700" }}>
                  {v}
                </Text>
              </View>
              <Caption>{labels[i]}</Caption>
            </View>
          </Fragment>
        ))}
      </View>
      <View
        style={{ backgroundColor: t.accentTint, borderRadius: 7, padding: 9 }}
      >
        <Text style={{ color: t.text, fontSize: 13 }}>
          {pending === 1
            ? "1 produzida ainda sem venda"
            : pending + " produzidas ainda sem venda"}
        </Text>
      </View>
    </Card>
  );
}

function tickStep(range: number, integer = false) {
  const rough = (range || 1) / 4,
    power = 10 ** Math.floor(Math.log10(rough));
  const step = ([1, 2, 5, 10].find((v) => v * power >= rough) ?? 10) * power;
  return integer ? Math.max(1, step) : Math.max(0.01, step);
}

export function CategoryChart({
  items,
}: {
  items: Schema["VendasCategoria"][];
}) {
  const t = useTheme(),
    max = Math.max(1, ...items.map((v) => v.unidades ?? 0));
  const tick = tickStep(max, true),
    columns = Math.ceil(max / tick),
    end = columns * tick;
  return (
    <Card>
      <Body strong>Vendas por categoria</Body>
      <Caption>Unidades vendidas no período</Caption>
      {items.length ? (
        <View>
          {items.map((c, i) => (
            <View key={i} style={styles.row}>
              <Text
                style={{
                  width: "31%",
                  textAlign: "right",
                  fontSize: 12,
                  color: t.muted,
                }}
              >
                {c.nome}
              </Text>
              <View
                style={{
                  flex: 1,
                  height: 34,
                  justifyContent: "center",
                  borderRightWidth: 1,
                  borderColor: t.border,
                }}
              >
                <View
                  style={[StyleSheet.absoluteFill, { flexDirection: "row" }]}
                >
                  {Array.from({ length: columns }, (_, j) => (
                    <View
                      key={j}
                      style={{
                        flex: 1,
                        borderLeftWidth: 1,
                        borderColor: t.border,
                      }}
                    />
                  ))}
                </View>
                <View
                  style={{
                    height: 19,
                    width: `${(100 * (c.unidades ?? 0)) / end}%`,
                    backgroundColor: "#8174bc",
                    borderTopRightRadius: 5,
                    borderBottomRightRadius: 5,
                  }}
                />
              </View>
              <Text style={{ minWidth: 22, color: t.text, fontSize: 12 }}>
                {c.unidades}
              </Text>
            </View>
          ))}
          <View style={styles.row}>
            <View style={{ width: "31%" }} />
            <View
              style={{
                flex: 1,
                flexDirection: "row",
                justifyContent: "space-between",
              }}
            >
              {Array.from({ length: columns + 1 }, (_, i) => (
                <Caption key={i}>{i * tick}</Caption>
              ))}
            </View>
            <View style={{ minWidth: 22 }} />
          </View>
        </View>
      ) : (
        <Body muted>Nenhuma unidade vendida no período.</Body>
      )}
    </Card>
  );
}

export function ProfitChart({
  points,
  monthly,
  change,
}: {
  points: Schema["PontoLucro"][];
  monthly: boolean;
  change?: string;
}) {
  const t = useTheme(),
    [width, setWidth] = useState(0),
    [selected, select] = useState<number>();
  const values = useMemo(
    () => points.map((p) => Number(p.valor ?? 0)),
    [points],
  );
  const max = Math.max(0, ...values),
    min = Math.min(0, ...values),
    tick = tickStep(max - min);
  const high = max === min ? tick * 4 : Math.ceil(max / tick) * tick,
    low = Math.floor(min / tick) * tick;
  const plotHeight = 126,
    y = (v: number) => 5 + (plotHeight * (high - v)) / (high - low);
  const dx = width / Math.max(1, points.length - 1);
  const ticks = Array.from(
    { length: Math.round((high - low) / tick) + 1 },
    (_, i) => high - i * tick,
  );
  const labels = [
    ...new Set([
      0,
      Math.round((points.length - 1) / 3),
      Math.round((2 * (points.length - 1)) / 3),
      points.length - 1,
    ]),
  ];
  const zero = y(0);
  // Sample a smooth interpolation inside each interval. Staying between its endpoints preserves peaks and losses.
  const segments = useMemo(() => {
    const result: { left: number; w: number; a: number; b: number }[] = [];
    for (let i = 1; i < values.length && dx > 0; i++) {
      const steps =
          values[i] === values[i - 1]
            ? 1
            : Math.min(32, Math.max(1, Math.ceil(dx / 3))),
        w = dx / steps;
      let previous = values[i - 1];
      for (let j = 1; j <= steps; j++) {
        const u = j / steps,
          current =
            values[i - 1] + (values[i] - values[i - 1]) * u * u * (3 - 2 * u);
        result.push({
          left: (i - 1) * dx + (j - 1) * w,
          w,
          a: previous,
          b: current,
        });
        previous = current;
      }
    }
    return result;
  }, [dx, values]);
  return (
    <Card>
      <Body strong>Lucro líquido estimado</Body>
      <Caption>
        {selected == null
          ? "Lucro por " + (monthly ? "mês" : "dia") + " no período selecionado"
          : points[selected]?.data + " · " + reais(points[selected]?.valor)}
      </Caption>
      {change && <Caption>{change}</Caption>}
      {points.length ? (
        <>
          <View style={{ flexDirection: "row", gap: 6, paddingVertical: 5 }}>
            <View style={{ width: 60, height: 136 }}>
              {ticks.map((v, i) => (
                <Text
                  key={i}
                  adjustsFontSizeToFit
                  numberOfLines={1}
                  style={{
                    position: "absolute",
                    right: 0,
                    left: 0,
                    textAlign: "right",
                    top: y(v) - 7,
                    color: t.muted,
                    fontSize: 10,
                  }}
                >
                  R$ {Number(v.toFixed(2)).toLocaleString("pt-BR")}
                </Text>
              ))}
            </View>
            <Pressable
              accessibilityRole="adjustable"
              accessibilityLabel="Lucro no período"
              accessibilityValue={{
                text:
                  selected == null
                    ? reais(String(max))
                    : points[selected]?.data +
                      " " +
                      reais(points[selected]?.valor),
              }}
              accessibilityActions={[
                { name: "increment" },
                { name: "decrement" },
              ]}
              onAccessibilityAction={(e) =>
                select((i) =>
                  Math.min(
                    points.length - 1,
                    Math.max(
                      0,
                      (i ?? 0) +
                        (e.nativeEvent.actionName === "increment" ? 1 : -1),
                    ),
                  ),
                )
              }
              onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
              onPress={(e) =>
                select(
                  Math.max(
                    0,
                    Math.min(
                      points.length - 1,
                      Math.round(e.nativeEvent.locationX / (dx || 1)),
                    ),
                  ),
                )
              }
              style={{ flex: 1, height: 136, overflow: "hidden" }}
            >
              <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {ticks.map((v, i) => (
                  <View
                    key={i}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      height: 1,
                      top: y(v),
                      backgroundColor: t.border,
                    }}
                  />
                ))}
                {segments.map((s, i) => {
                  const a = y(s.a),
                    b = y(s.b),
                    mid = (a + b) / 2,
                    length = Math.hypot(s.w, b - a);
                  return (
                    <Fragment key={i}>
                      <View
                        style={{
                          position: "absolute",
                          left: s.left,
                          width: s.w + 0.4,
                          top: Math.min(mid, zero),
                          height: Math.abs(mid - zero),
                          backgroundColor: t.primary + "30",
                        }}
                      />
                      <View
                        style={{
                          position: "absolute",
                          left: s.left + (s.w - length) / 2,
                          width: length + 0.6,
                          top: mid - 1,
                          height: 2,
                          backgroundColor: t.primary,
                          transform: [
                            { rotate: Math.atan2(b - a, s.w) + "rad" },
                          ],
                        }}
                      />
                    </Fragment>
                  );
                })}
                {values.map(
                  (v, i) =>
                    (selected === i ||
                      (v !== 0 &&
                        (values.length <= 35 || v === max || v === min)) ||
                      values.length === 1) && (
                      <View
                        key={i}
                        style={{
                          position: "absolute",
                          left: Math.max(0, Math.min(width - 6, i * dx - 3)),
                          top: y(v) - 3,
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: t.primary,
                          borderWidth: 1,
                          borderColor: t.surface,
                        }}
                      />
                    ),
                )}
              </View>
            </Pressable>
          </View>
          <View
            style={{
              marginLeft: 66,
              flexDirection: "row",
              justifyContent: "space-between",
            }}
          >
            {labels.map((i) => (
              <Caption key={i}>{points[i].data}</Caption>
            ))}
          </View>
        </>
      ) : (
        <Body muted>Nenhum resultado neste período.</Body>
      )}
    </Card>
  );
}
const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
});
