import { Fragment, useMemo, useState } from "react";
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

function mixColor(a: string, b: string, weight: number) {
  const left = [1, 3, 5].map((index) => parseInt(a.slice(index, index + 2), 16));
  const right = [1, 3, 5].map((index) => parseInt(b.slice(index, index + 2), 16));
  return "#" + left.map((value, index) => Math.round(value * (1 - weight) + right[index] * weight).toString(16).padStart(2, "0")).join("");
}

function categoryColor(name: string) {
  let hash = 0;
  for (const char of name.toLocaleLowerCase("pt-BR")) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const saturation = 0.52;
  const lightness = 0.8;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const base = hue < 60 ? [chroma, second, 0] : hue < 120 ? [second, chroma, 0] : hue < 180 ? [0, chroma, second] : hue < 240 ? [0, second, chroma] : hue < 300 ? [second, 0, chroma] : [chroma, 0, second];
  const offset = lightness - chroma / 2;
  return "#" + base.map((value) => Math.round((value + offset) * 255).toString(16).padStart(2, "0")).join("");
}

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
      <Body strong>Lucro por plataforma</Body>
      <Caption>Vendas 3D</Caption>
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
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 28 }}>
        <Body strong>Estoque de filamentos</Body>
        <Caption>Saldo por rolo</Caption>
      </View>
      {items.length ? (
        <View
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 14 }}
        >
          {items.map((f, i) => {
            const n = Math.max(0, Math.min(100, f.restante ?? 0));
            const color = n <= 34 ? "#c54c44" : n <= 64 ? "#d5a130" : "#648b70";
            const saldo = decimal(f.gramas, 2) + " g";
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
                    backgroundColor: t.accentTint,
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: 2,
                  }}
                >
                  {Array.from({ length: 60 }, (_, segment) => {
                    const active = n === 0 ? segment === 0 : segment < Math.ceil(n * 0.6);
                    if (!active) return null;
                    const theta = (segment / 60) * Math.PI * 2 - Math.PI / 2;
                    const dot = 7;
                    const center = size / 2;
                    const radius = center - dot / 2;
                    return <View key={segment} style={{ position: "absolute", left: center + Math.cos(theta) * radius - dot / 2, top: center + Math.sin(theta) * radius - dot / 2, width: dot, height: dot, borderRadius: dot / 2, backgroundColor: color }} />;
                  })}
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
  const [flowWidth, setFlowWidth] = useState(0);
  const t = useTheme(),
    values = [data.calculadas ?? 0, data.produzidas ?? 0, data.vendidas ?? 0];
  const colors = [mixColor(t.primary, "#FFFFFF", 0.66), mixColor(t.primary, "#FFFFFF", 0.3), t.primary],
    labels = ["calculados", "produzidos", "vendidos"];
  const pending = Math.max(0, values[1] - values[2]);
  return (
    <Card>
      <Body strong>Fluxo de produção</Body>
      <Caption>Impressões 3D calculadas no período</Caption>
      <View onLayout={(event) => setFlowWidth(event.nativeEvent.layout.width)} style={{ alignItems: "center", gap: 0, paddingTop: 5 }}>
        {values.map((value, index) => {
          const outer = [1, 0.82, 0.64][index];
          const inner = [0.82, 0.64, 0.5][index];
          const side = flowWidth ? Math.max(1, (flowWidth * outer * (outer - inner)) / (2 * outer)) : 0;
          const color = colors[index];
          return <View key={labels[index]} style={{ width: `${outer * 100}%`, height: 46, flexDirection: "row", alignItems: "stretch", justifyContent: "center" }}>
            {flowWidth > 0 && <View style={{ width: 0, height: 0, alignSelf: "flex-start", borderBottomWidth: 46, borderBottomColor: color, borderRightWidth: side, borderRightColor: "transparent" }} />}
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: color }}><Text style={{ color: readable(color), fontSize: 21, fontWeight: "700", lineHeight: 24 }}>{value}</Text><Text style={{ color: readable(color), fontSize: 12 }}>{labels[index]}</Text></View>
            {flowWidth > 0 && <View style={{ width: 0, height: 0, alignSelf: "flex-start", borderBottomWidth: 46, borderBottomColor: color, borderLeftWidth: side, borderLeftColor: "transparent" }} />}
          </View>;
        })}
      </View>
      <View style={{ position: "absolute", right: 13, top: 89, gap: 37 }}><Text style={{ color: t.text, backgroundColor: t.border, borderRadius: 16, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "700" }}>{values[0] ? Math.round(values[1] * 100 / values[0]) : 0}%</Text><Text style={{ color: t.text, backgroundColor: t.border, borderRadius: 16, overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "700" }}>{values[1] ? Math.round(values[2] * 100 / values[1]) : 0}%</Text></View>
      <Caption>{pending === 1 ? "1 produzida ainda sem venda" : `${pending} produzidas ainda sem venda`}</Caption>
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
  const t = useTheme();
  const sorted = [...items].sort((a, b) => (b.unidades ?? 0) - (a.unidades ?? 0));
  const total = sorted.reduce((sum, row) => sum + (row.unidades ?? 0), 0);
  return (
    <Card>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Body strong>Vendas por categoria</Body><Caption>{total} unidades</Caption></View>
      {sorted.length ? <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3, marginTop: 2 }}>{sorted.map((row, index) => {
        const color = categoryColor(row.nome ?? String(index));
        const ink = readable(color);
        return <View key={row.nome ?? index} style={{ flexGrow: index < 2 ? 2 : 1, flexBasis: index < 2 ? "46%" : "29%", height: 76, borderRadius: 9, padding: 9, justifyContent: "space-between", backgroundColor: color }}><Text numberOfLines={1} style={{ color: ink, fontSize: 12 }}>{row.nome}</Text><Text style={{ color: ink, fontSize: 20, fontWeight: "700" }}>{row.unidades}</Text></View>;
      })}</View> : (
        <Body muted>Nenhuma unidade vendida no período.</Body>
      )}
    </Card>
  );
}

type ProductionPoint = { data?: string; unidades?: number };
export function ProductionRhythm({ points, period }: { points: ProductionPoint[]; period: string }) {
  const t = useTheme();
  const days = period === "30" ? 30 : period === "90" ? 90 : 84;
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const first = new Date(end);
  first.setDate(first.getDate() - days + 1);
  first.setDate(first.getDate() - first.getDay());
  const totalCells = Math.ceil((days + end.getDay() + 1) / 7) * 7;
  const counts = new Map(points.map(point => [point.data ?? "", point.unidades ?? 0]));
  const cells = Array.from({ length: totalCells }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { key, day: date.getDate(), month: date.getMonth() === end.getMonth(), value: counts.get(key) ?? 0, current: date.getTime() === end.getTime() };
  });
  const maximum = Math.max(1, ...cells.map(cell => cell.value));
  const colors = [t.surface, t.accentTint, mixColor(t.primary, "#FFFFFF", 0.28), t.primary];
  return <Card>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Body strong>Ritmo de produção</Body><Caption>Impressões por dia</Caption></View>
    {period === "tudo" && <Caption>Últimas 12 semanas</Caption>}
    <View style={{ flexDirection: "row", gap: 4 }}>{["D", "S", "T", "Q", "Q", "S", "S"].map((day, index) => <Text key={index} style={{ flex: 1, textAlign: "center", color: t.muted, fontSize: 10 }}>{day}</Text>)}</View>
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>{cells.map(cell => {
      const level = cell.value === 0 ? 0 : cell.value / maximum < 0.34 ? 1 : cell.value / maximum < 0.68 ? 2 : 3;
      return <View key={cell.key} accessible accessibilityLabel={cell.key + ", " + cell.value + " impressões"} style={{ width: "13.6%", flexGrow: 1, height: 36, borderRadius: 6, backgroundColor: colors[level], borderWidth: cell.current ? 1.5 : 1, borderColor: cell.current ? t.text : t.border, opacity: cell.month ? 1 : 0.55, alignItems: "center", justifyContent: "center" }}><Text style={{ color: readable(colors[level]), fontSize: 10 }}>{cell.day}</Text></View>;
    })}</View>
  </Card>;
}

export function ExtraCostProgress({ items }: { items: Schema["CustoResumo"][] }) {
  const t = useTheme();
  const target = items.reduce((sum, item) => sum + Number(item.meta ?? 0), 0);
  const recovered = items.reduce((sum, item) => sum + Number(item.recuperado ?? 0), 0);
  const ratio = target > 0 ? Math.min(100, Math.max(0, recovered * 100 / target)) : 0;
  const gaugeDots = Array.from({ length: 72 }, (_, index) => {
    const angle = Math.PI + (Math.PI * index) / 71;
    const dot = 7;
    const cx = 100;
    const cy = 90;
    const radius = 72;
    return { index, left: cx + Math.cos(angle) * radius - dot / 2, top: cy + Math.sin(angle) * radius - dot / 2, done: (index / 71) * 100 <= ratio };
  });
  return <Card>
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}><Body strong>Custos extras</Body><Caption>Meta recuperada</Caption></View>
    {target > 0 ? <View style={{ alignItems: "center", height: 112, marginTop: 5 }}>
      {gaugeDots.map(dot => <View key={dot.index} style={{ position: "absolute", left: dot.left, top: dot.top, width: 7, height: 7, borderRadius: 4, backgroundColor: dot.done ? t.success : t.border }} />)}
      <View style={{ position: "absolute", top: 39, alignItems: "center", gap: 1 }}><Text style={{ color: t.primaryText, fontSize: 28, fontWeight: "700" }}>{Math.round(ratio)}%</Text><Caption>{reais(recovered.toFixed(2))} de {reais(target.toFixed(2))}</Caption></View>
    </View> : <Body muted>Nenhuma meta de custo cadastrada.</Body>}
  </Card>;
}

export function ProfitChart({
  points,
  monthly,
  change,
  title = "Lucro líquido estimado",
}: {
  points: Schema["PontoLucro"][];
  monthly: boolean;
  change?: string;
  title?: string;
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
      <Body strong>{title}</Body>
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
