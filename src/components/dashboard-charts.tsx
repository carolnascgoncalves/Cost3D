import { Fragment, useMemo, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
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
const tone = (key?: string) =>
  /^#[\da-f]{6}$/i.test(key ?? "")
    ? (key as string)
    : (platformTones[key ?? ""] ?? "#9184a5");

function mixColor(a: string, b: string, weight: number) {
  const left = [1, 3, 5].map((index) =>
    parseInt(a.slice(index, index + 2), 16),
  );
  const right = [1, 3, 5].map((index) =>
    parseInt(b.slice(index, index + 2), 16),
  );
  return (
    "#" +
    left
      .map((value, index) =>
        Math.round(value * (1 - weight) + right[index] * weight)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}

function categoryColor(name: string) {
  let hash = 0;
  for (const char of name.toLocaleLowerCase("pt-BR"))
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const hue = hash % 360;
  const saturation = 0.52;
  const lightness = 0.8;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const second = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const base =
    hue < 60
      ? [chroma, second, 0]
      : hue < 120
        ? [second, chroma, 0]
        : hue < 180
          ? [0, chroma, second]
          : hue < 240
            ? [0, second, chroma]
            : hue < 300
              ? [second, 0, chroma]
              : [chroma, 0, second];
  const offset = lightness - chroma / 2;
  return (
    "#" +
    base
      .map((value) =>
        Math.round((value + offset) * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
const categoryPalette = [
  "#F3BCD0",
  "#9FE1CB",
  "#C8C4F2",
  "#FAC775",
  "#9BCDF2",
  "#F5B99A",
  "#A9DDE3",
  "#F1C0E8",
  "#C9DF9C",
  "#E5B6AC",
  "#B5C9EE",
  "#F0D69B",
  "#B8D6C2",
  "#D7BDEB",
  "#F2C6B5",
  "#B4D8E9",
  "#D8D0A5",
  "#E7BFC9",
];

function Caption({ children }: { children: React.ReactNode }) {
  const t = useTheme();
  return <Text style={{ fontSize: 12, color: t.muted }}>{children}</Text>;
}

function PlatformDonut({
  slices,
  size = 160,
  stroke = 26,
}: {
  slices: { value: number; color: string }[];
  size?: number;
  stroke?: number;
}) {
  const t = useTheme();
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const center = size / 2,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r;
  let done = 0;
  return (
    <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
      <Circle
        cx={center}
        cy={center}
        r={r}
        fill="none"
        stroke={t.border}
        strokeWidth={stroke}
      />
      {total > 0 &&
        slices.map((s, i) => {
          const part = (c * s.value) / total,
            // small gap between slices, none when there is only one
            gap =
              slices.filter((x) => x.value > 0).length > 1
                ? Math.min(2, part / 3)
                : 0,
            offset = -done;
          done += part;
          return s.value > 0 ? (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, part - gap)} ${c}`}
              strokeDashoffset={offset}
              rotation={-90}
              origin={`${center}, ${center}`}
            />
          ) : null;
        })}
    </Svg>
  );
}

export function PlatformChart({ data }: { data: Panel }) {
  const t = useTheme(),
    rows = data.plataformas ?? [];
  const size = 160;
  const magnitude = rows.reduce(
    (sum, p) => sum + Math.abs(Number(p.lucro ?? 0)),
    0,
  );
  const count = rows.reduce((sum, p) => sum + (p.vendas ?? 0), 0);
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Body strong>Lucro por plataforma</Body>
        <Caption>Vendas 3D</Caption>
      </View>
      {rows.length ? (
        <>
          <View
            accessible
            accessibilityLabel={
              reais(data.lucroPlataformas) + ", " + count + " vendas"
            }
            style={{
              alignSelf: "center",
              width: size,
              height: size,
              alignItems: "center",
              justifyContent: "center",
              marginVertical: 6,
            }}
          >
            <PlatformDonut
              size={size}
              slices={rows.map((p) => ({
                value: Math.abs(Number(p.lucro ?? 0)),
                color: tone(p.cor),
              }))}
            />
            <View style={{ width: size - 70, alignItems: "center" }}>
              <Text
                adjustsFontSizeToFit
                numberOfLines={1}
                style={{ color: t.text, fontWeight: "700", fontSize: 18 }}
              >
                {reais(data.lucroPlataformas)}
              </Text>
              <Caption>
                {count} {count === 1 ? "venda" : "vendas"}
              </Caption>
            </View>
          </View>
          {rows.map((p, i) => {
            const share = magnitude
              ? Math.round((100 * Math.abs(Number(p.lucro ?? 0))) / magnitude)
              : 0;
            return (
              <View key={i} style={styles.row}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: tone(p.cor),
                  }}
                />
                <Text numberOfLines={1} style={{ flex: 1, color: t.text }}>
                  {p.nome}{" "}
                  <Text style={{ fontSize: 11, color: t.muted }}>
                    {p.vendas} {p.vendas === 1 ? "venda" : "vendas"}
                  </Text>
                </Text>
                <Text style={{ color: t.text, fontWeight: "700" }}>
                  {share}%
                </Text>
              </View>
            );
          })}
        </>
      ) : (
        <Body muted>Nenhuma venda 3D no período.</Body>
      )}
    </Card>
  );
}

const stockColors = { low: "#d9534f", mid: "#e2a233", ok: "#6a9f2f" };
const stockColor = (percent: number) =>
  percent <= 15
    ? stockColors.low
    : percent <= 40
      ? stockColors.mid
      : stockColors.ok;

// One ring = two SVG circles (instead of 60 absolutely positioned dots per filament).
function StockRing({
  percent,
  color,
  dot,
  size = 56,
}: {
  percent: number;
  color: string;
  dot: string;
  size?: number;
}) {
  const t = useTheme();
  const stroke = 6,
    center = size / 2,
    r = (size - stroke) / 2,
    c = 2 * Math.PI * r,
    // an empty roll still shows a small marker at the top
    len = percent <= 0 ? 0.01 : (c * Math.min(100, percent)) / 100;
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke="transparent"
          strokeWidth={stroke}
        />
        <Circle
          cx={center}
          cy={center}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${len} ${c}`}
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
      <View
        style={{
          width: 20,
          height: 20,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: t.border,
          backgroundColor: dot,
        }}
      />
    </View>
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
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          minHeight: 28,
        }}
      >
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
                <StockRing
                  percent={n}
                  color={stockColor(n)}
                  dot={f.cor ?? t.border}
                />
                <Text
                  numberOfLines={1}
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

// The funnel is drawn with SVG polygons, so it looks the same on web, iOS and Android
// (the old version used CSS clip-path, which only exists on web).
export function ProductionFlow({ data }: { data: Panel }) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const values = [
    data.calculadas ?? 0,
    data.produzidas ?? 0,
    data.vendidas ?? 0,
  ];
  const colors = [
    mixColor(t.primary, "#FFFFFF", 0.66),
    mixColor(t.primary, "#FFFFFF", 0.3),
    t.primary,
  ];
  const labels = ["calculados", "produzidos", "vendidos"];
  const pending = Math.max(0, values[1] - values[2]);
  const rates = [
    values[0] ? Math.round((values[1] * 100) / values[0]) : 0,
    values[1] ? Math.round((values[2] * 100) / values[1]) : 0,
  ];
  const rowH = 58,
    gap = 6,
    chipW = 54,
    chipH = 26,
    total = rowH * 3 + gap * 2;
  // leave room on the right for the percentage chips
  const first = width
    ? Math.max(0.5, Math.min(0.8, (width - chipW * 2 - 8) / width))
    : 0.7;
  const edges = [1, first, first - 0.14, first - 0.24];
  const inset = 3;
  return (
    <Card>
      <Body strong>Fluxo de produção</Body>
      <Caption>Impressões 3D calculadas no período</Caption>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={{ height: total, marginTop: 6 }}
      >
        {width > 0 && (
          <>
            <Svg width={width} height={total} style={StyleSheet.absoluteFill}>
              {values.map((_, i) => {
                const y0 = i * (rowH + gap) + inset,
                  y1 = i * (rowH + gap) + rowH - inset;
                const l0 = (width * (1 - edges[i])) / 2 + inset,
                  l1 = (width * (1 - edges[i + 1])) / 2 + inset;
                const pts = `${l0},${y0} ${width - l0},${y0} ${width - l1},${y1} ${l1},${y1}`;
                return (
                  <Polygon
                    key={i}
                    points={pts}
                    fill={colors[i]}
                    stroke={colors[i]}
                    strokeWidth={inset * 2}
                    strokeLinejoin="round"
                  />
                );
              })}
            </Svg>
            {values.map((value, i) => (
              <View
                key={labels[i]}
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: i * (rowH + gap),
                  height: rowH,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: readable(colors[i]),
                    fontSize: 21,
                    fontWeight: "700",
                    lineHeight: 24,
                  }}
                >
                  {value}
                </Text>
                <Text style={{ color: readable(colors[i]), fontSize: 12 }}>
                  {labels[i]}
                </Text>
              </View>
            ))}
            {rates.map((rate, i) => (
              <View
                key={i}
                pointerEvents="none"
                accessible
                accessibilityLabel={
                  (i === 0
                    ? "Produzidos de calculados: "
                    : "Vendidos de produzidos: ") +
                  rate +
                  "%"
                }
                style={{
                  position: "absolute",
                  right: 0,
                  top: (i + 1) * (rowH + gap) - gap / 2 - chipH / 2,
                  minWidth: chipW - 8,
                  height: chipH,
                  paddingHorizontal: 9,
                  borderRadius: chipH / 2,
                  backgroundColor: t.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ color: t.text, fontSize: 11, fontWeight: "700" }}
                >
                  {rate}%
                </Text>
              </View>
            ))}
          </>
        )}
      </View>
      <Caption>
        {pending === 1
          ? "1 produzida ainda sem venda"
          : `${pending} produzidas ainda sem venda`}
      </Caption>
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
  const sorted = [...items].sort(
    (a, b) => (b.unidades ?? 0) - (a.unidades ?? 0),
  );
  const names = [...sorted]
    .map((row) => row.nome ?? "")
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  const colorsByName = new Map(
    names.map((name, index) => [
      name,
      categoryPalette[index % categoryPalette.length],
    ]),
  );
  const total = sorted.reduce((sum, row) => sum + (row.unidades ?? 0), 0);
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Body strong>Vendas por categoria</Body>
        <Caption>{total} unidades</Caption>
      </View>
      {sorted.length ? (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 3,
            marginTop: 2,
          }}
        >
          {sorted.map((row, index) => {
            const color =
              colorsByName.get(row.nome ?? "") ??
              categoryColor(row.nome ?? String(index));
            const ink = readable(color);
            return (
              <View
                key={row.nome ?? index}
                style={{
                  flexGrow: index < 2 ? 2 : 1,
                  flexBasis: index < 2 ? "46%" : "29%",
                  height: 76,
                  borderRadius: 9,
                  padding: 9,
                  justifyContent: "space-between",
                  backgroundColor: color,
                }}
              >
                <Text numberOfLines={1} style={{ color: ink, fontSize: 12 }}>
                  {row.nome}
                </Text>
                <Text style={{ color: ink, fontSize: 20, fontWeight: "700" }}>
                  {row.unidades}
                </Text>
              </View>
            );
          })}
        </View>
      ) : (
        <Body muted>Nenhuma unidade vendida no período.</Body>
      )}
    </Card>
  );
}

type ProductionPoint = { data?: string; unidades?: number };
const weekdayNames = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

type RhythmCell = {
  key: string;
  day: number;
  label: string;
  value: number;
  today: boolean;
};

export function ProductionRhythm({
  points,
  period,
}: {
  points: ProductionPoint[];
  period: string;
}) {
  const t = useTheme();
  const [selected, setSelected] = useState<string>();
  const days = period === "30" ? 30 : period === "90" ? 90 : 84;
  const { weeks, total, active, maximum } = useMemo(() => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(end);
    start.setDate(start.getDate() - days + 1);
    const counts = new Map(points.map((p) => [p.data ?? "", p.unidades ?? 0]));
    const cells: (RhythmCell | null)[] = Array.from(
      { length: start.getDay() },
      () => null,
    );
    let sum = 0,
      busy = 0,
      peak = 1;
    for (let i = 0; i < days; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const key = dateKey(date);
      const value = counts.get(key) ?? 0;
      sum += value;
      if (value > 0) busy++;
      peak = Math.max(peak, value);
      cells.push({
        key,
        day: date.getDate(),
        label: `${weekdayNames[date.getDay()]}, ${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
        value,
        today: i === days - 1,
      });
    }
    while (cells.length % 7) cells.push(null);
    const rows: (RhythmCell | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return { weeks: rows, total: sum, active: busy, maximum: peak };
  }, [points, days]);
  // zero, then four steps from the surface color up to the store's primary color
  const scale = [0.22, 0.45, 0.72, 1].map((w) =>
    mixColor(t.surface, t.primary, w),
  );
  const colorOf = (value: number) =>
    value <= 0
      ? t.border
      : scale[Math.min(3, Math.ceil((value / maximum) * 4) - 1)];
  const chosen = weeks.flat().find((c) => c?.key === selected);
  const unit = (n: number) => (n === 1 ? "impressão" : "impressões");
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Body strong>Ritmo de produção</Body>
        <Caption>
          {period === "tudo" ? "Últimas 12 semanas" : "Impressões por dia"}
        </Caption>
      </View>
      <Text style={{ color: t.text, fontSize: 13, minHeight: 18 }}>
        {chosen
          ? `${chosen.label} · ${chosen.value} ${unit(chosen.value)}`
          : `${total} ${unit(total)} em ${active} de ${days} dias`}
      </Text>
      <View
        style={{ width: "100%", maxWidth: 420, alignSelf: "center", gap: 4 }}
      >
        <View style={{ flexDirection: "row", gap: 4 }}>
          {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
            <Text
              key={i}
              style={{
                flex: 1,
                textAlign: "center",
                color: t.muted,
                fontSize: 10,
              }}
            >
              {d}
            </Text>
          ))}
        </View>
        {weeks.map((week, w) => (
          <View key={w} style={{ flexDirection: "row", gap: 4 }}>
            {week.map((cell, i) => {
              if (!cell)
                return <View key={i} style={{ flex: 1, aspectRatio: 1 }} />;
              const bg = colorOf(cell.value);
              const isSelected = cell.key === selected;
              return (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${cell.label}, ${cell.value} ${unit(cell.value)}`}
                  onPress={() => setSelected(isSelected ? undefined : cell.key)}
                  style={{
                    flex: 1,
                    aspectRatio: 1,
                    borderRadius: 9,
                    backgroundColor: bg,
                    borderWidth: cell.today || isSelected ? 2 : 0,
                    borderColor: isSelected ? t.primaryText : t.text,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text
                    style={{
                      color: cell.value > 0 ? readable(bg) : t.muted,
                      fontSize: 11,
                      fontWeight: cell.value > 0 ? "700" : "400",
                    }}
                  >
                    {cell.day}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        ))}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            marginTop: 4,
          }}
        >
          <Caption>Menos</Caption>
          {[t.border, ...scale].map((c, i) => (
            <View
              key={i}
              style={{
                width: 12,
                height: 12,
                borderRadius: 4,
                backgroundColor: c,
              }}
            />
          ))}
          <Caption>Mais</Caption>
        </View>
      </View>
    </Card>
  );
}

function polar(cx: number, cy: number, r: number, degrees: number) {
  const a = (degrees * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}
// SVG angles: 0° points right and grows clockwise, so 180° -> 360° is the top half.
function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from),
    b = polar(cx, cy, r, to);
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`;
}

export function ExtraCostProgress({
  items,
}: {
  items: Schema["CustoResumo"][];
}) {
  const t = useTheme();
  const target = items.reduce((sum, item) => sum + Number(item.meta ?? 0), 0);
  const recovered = items.reduce(
    (sum, item) => sum + Number(item.recuperado ?? 0),
    0,
  );
  const ratio =
    target > 0 ? Math.min(100, Math.max(0, (recovered * 100) / target)) : 0;
  const stroke = 16,
    w = 220,
    r = (w - stroke) / 2,
    cx = w / 2,
    cy = r + stroke / 2,
    h = cy + stroke / 2;
  const end = 180 + Math.min(179.99, (180 * ratio) / 100);
  return (
    <Card>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Body strong>Custos extras</Body>
        <Caption>Meta recuperada</Caption>
      </View>
      {target > 0 ? (
        <View
          accessible
          accessibilityLabel={`${Math.round(ratio)}% da meta recuperada, ${reais(recovered.toFixed(2))} de ${reais(target.toFixed(2))}`}
          style={{
            alignSelf: "center",
            width: w,
            maxWidth: "100%",
            height: h,
            marginTop: 8,
          }}
        >
          <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
            <Path
              d={arc(cx, cy, r, 180, 359.99)}
              stroke={t.border}
              strokeWidth={stroke}
              strokeLinecap="round"
              fill="none"
            />
            {ratio > 0 && (
              <Path
                d={arc(cx, cy, r, 180, end)}
                stroke={t.success}
                strokeWidth={stroke}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </Svg>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              bottom: 0,
              alignItems: "center",
              gap: 1,
            }}
          >
            <Text
              style={{
                color: t.primaryText,
                fontSize: 30,
                fontWeight: "700",
                lineHeight: 34,
              }}
            >
              {Math.round(ratio)}%
            </Text>
            <Caption>
              {reais(recovered.toFixed(2))} de {reais(target.toFixed(2))}
            </Caption>
          </View>
        </View>
      ) : (
        <Body muted>Nenhuma meta de custo cadastrada.</Body>
      )}
    </Card>
  );
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
