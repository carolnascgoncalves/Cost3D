import { pieceCalculation } from "@/features/calculation-route";
import { router } from "expo-router";
import { Icon } from "./icon";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { components } from "@/api/schema";
import { useTheme } from "@/theme/provider";
import { useCachedApiQuery } from "@/hooks/use-cached-api-query";
import { decimal, reais } from "@/features/format";
import { openWebsite } from "@/features/website";
import { Body, Button, Card, Notice } from "./ui";

type Schemas = components["schemas"];
export type CatalogRow = Schemas["PecaCatalogo"] &
  Schemas["ImpressoraCatalogo"] &
  Schemas["FilamentoCatalogo"] &
  Schemas["EmbalagemCatalogo"];
export type CatalogCategory =
  "pecas" | "filamentos" | "impressoras" | "embalagens";
export const catalogPaths = {
  pecas: "peca",
  filamentos: "filamento",
  impressoras: "impressora",
  embalagens: "embalagem",
};
function Metric({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <Body muted>{label}</Body>
      <Text style={{ color: t.text, fontSize: 17, fontWeight: "700" }}>
        {value}
      </Text>
    </View>
  );
}
export function stockLevel(row: CatalogRow) {
  const grams = Number(row.estoque),
    weight = Number(row.pesoRolo);
  if (row.estoque == null || !(weight > 0) || !Number.isFinite(grams))
    return undefined;
  const rolls = Math.max(0, Math.ceil(grams / weight));
  const percent = Math.max(
    0,
    Math.min(100, Math.round((100 * grams) / (weight * Math.max(1, rolls)))),
  );
  return { rolls, percent, low: percent <= 34 };
}
export function PiecePhoto({
  row,
  large = false,
  compact = false,
  medium = false,
}: {
  row: CatalogRow;
  large?: boolean;
  compact?: boolean;
  medium?: boolean;
}) {
  const t = useTheme();
  const photo = useCachedApiQuery<Schemas["FotoCatalogo"]>(
    row.id && row.placaMiniatura
      ? "/catalogo/pecas/" +
          encodeURIComponent(row.id) +
          "/placas/" +
          row.placaMiniatura +
          "/foto"
      : null,
  );
  const [failed, setFailed] = useState(false);
  return (
    <View
      style={[
        s.photo,
        compact && { width: 32, height: 32, borderRadius: 8 },
        medium && { width: 54, height: 54, borderRadius: 11, backgroundColor: t.accentTint },
        large && { width: "100%", height: 190, borderWidth: 0 },
        { backgroundColor: medium ? t.accentTint : t.surface, borderColor: t.border },
      ]}
    >
      {photo.data?.base64 && !failed ? (
        <Image
          accessibilityLabel={"Foto de " + row.nome}
          resizeMode="contain"
          style={{ width: "100%", height: "100%" }}
          fadeDuration={0}
          source={{
            uri: "data:" + photo.data.tipo + ";base64," + photo.data.base64,
          }}
          onError={() => setFailed(true)}
        />
      ) : large ? (
        <Body muted>
          {photo.loading ? "Carregando prévia…" : "Prévia indisponível"}
        </Body>
      ) : (
        <Icon name="box" color={t.muted} size={28} />
      )}
    </View>
  );
}
export function MaterialChips({
  materiais,
}: {
  materiais: CatalogRow["materiais"];
}) {
  const t = useTheme();
  return materiais?.length ? (
    <View style={s.chips}>
      {materiais.map((m, index) => (
        <View key={index} style={[s.material, { borderColor: t.border, backgroundColor: t.surface }]}>
          {!!m.corHex && (
            <View
              style={[
                s.dot,
                { backgroundColor: m.corHex, borderColor: t.border },
              ]}
            />
          )}
          <Text style={{ flexShrink: 1, color: t.text, fontSize: 13 }}>
            {m.material || "Material"} · {decimal(String(m.pesoGramas), 1)} g
          </Text>
        </View>
      ))}
    </View>
  ) : null;
}
function PieceIdentity({ row }: { row: CatalogRow }) {
  const t = useTheme();
  return (
    <View style={s.identity}>
      <PiecePhoto row={row} />
      <View style={s.identityText}>
        <Text style={[s.name, { color: t.text }]}>{row.nome}</Text>
        {!!row.categoria && (
          <View style={{ alignSelf: "flex-start" }}>
            <Text
              style={[
                s.pill,
                {
                  backgroundColor: t.accentTint,
                  borderColor: t.border,
                  color: t.text,
                  fontWeight: "600",
                },
              ]}
            >
              {row.categoria}
            </Text>
          </View>
        )}
        <MaterialChips materiais={row.materiais} />
        {!!row.modeloImpressora && <Body muted>{row.modeloImpressora}</Body>}
      </View>
    </View>
  );
}
export function CatalogCard({
  onEdit,
  category,
  row,
  onDetails,
}: {
  onEdit: (purchase?: boolean) => void;
  category: CatalogCategory;
  row: CatalogRow;
  onDetails?: () => void;
}) {
  const t = useTheme();
  const [error, setError] = useState("");
  const filament = category === "filamentos";
  const printer = category === "impressoras";
  const level = stockLevel(row);
  const stockColor = level?.low
    ? t.danger
    : level && level.percent <= 64
      ? "#916424"
      : t.success;
  const openDetails = () => onDetails?.();
  const name = (subtitle?: string) => (
    <Pressable accessibilityRole="button" accessibilityLabel={"Ver detalhes de " + row.nome} onPress={openDetails} style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text numberOfLines={2} style={{ color: t.text, fontSize: 15, fontWeight: "700" }}>{row.nome}</Text>
      {!!subtitle && <Text numberOfLines={1} style={{ color: t.muted, fontSize: 12 }}>{subtitle}</Text>}
    </Pressable>
  );
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={"Ver detalhes de " + row.nome} onPress={openDetails}>
    <Card style={{ gap: 10, padding: 11 }}>
      {category === "pecas" ? <>
        <View style={s.identity}>
          <Pressable onPress={openDetails}><PiecePhoto row={row} medium /></Pressable>
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text numberOfLines={2} style={{ color: t.text, fontSize: 15, fontWeight: "700" }}>{row.nome}</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 5 }}>
              {!!row.categoria && <Text numberOfLines={1} style={{ color: t.muted, backgroundColor: t.accentTint, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2, fontSize: 11 }}>{row.categoria}</Text>}
              {row.materiais?.slice(0, 2).map((material, index) => <View key={index} style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: t.surface, borderColor: t.border, borderWidth: 1, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 2 }}>
                {!!material.corHex && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: material.corHex, borderWidth: 1, borderColor: t.border }} />}
                <Text numberOfLines={1} style={{ color: t.text, fontSize: 11 }}>{material.material || "Filamento"}</Text>
              </View>)}
            </View>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <Text style={{ color: t.muted, fontSize: 12 }}>Filamento <Text style={{ color: t.text, fontWeight: "600" }}>{row.gramas != null ? decimal(row.gramas, 1) + " g" : "—"}</Text></Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>Tempo <Text style={{ color: t.text, fontWeight: "600" }}>{row.minutos != null ? (row.minutos >= 60 ? Math.floor(row.minutos / 60) + " h " + (row.minutos % 60 ? row.minutos % 60 + " min" : "") : row.minutos + " min") : "—"}</Text></Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>Preço sugerido <Text style={{ color: t.text, fontWeight: "700" }}>{row.preco != null ? reais(row.preco) : "—"}</Text></Text>
        </View>
        <Button label="Calcular preço" variant="secondary" stopPropagation onPress={() => router.push(pieceCalculation(row))} />
      </> : filament ? <>
        <View style={s.identity}>
          <Pressable onPress={openDetails} style={[s.symbol, { width: 44, height: 44, borderRadius: 11, backgroundColor: row.codigoCor || t.accentTint, borderColor: t.border }]} />
          {name(row.cor)}
          {level && <Text style={{ color: level.low ? t.danger : t.success, backgroundColor: t.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 11, fontWeight: "600" }}>{level.low ? "Repor" : "Em dia"}</Text>}
        </View>
        <Pressable onPress={openDetails} style={{ gap: 7 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: t.text, fontSize: 13, fontWeight: "600" }}>{row.estoque == null ? "—" : decimal(row.estoque, 0) + " g de " + decimal(row.pesoRolo, 0) + " g"}</Text>
            {level && <Text style={{ color: level.low ? t.danger : t.success, fontSize: 12, fontWeight: "700" }}>{level.percent}%</Text>}
          </View>
          {level && <View accessibilityRole="progressbar" accessibilityValue={{ now: level.percent, min: 0, max: 100 }} style={{ height: 6, borderRadius: 8, overflow: "hidden", backgroundColor: t.border }}><View style={{ width: `${level.percent}%`, height: "100%", backgroundColor: stockColor }} /></View>}
        </Pressable>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <Text style={{ color: t.muted, fontSize: 12 }}>{reais(row.precoRolo)} / rolo</Text>
          <Button label="Registrar compra" icon="bag-plus" variant="secondary" compact stopPropagation onPress={() => onEdit(true)} />
        </View>
      </> : <>
        <View style={s.identity}>
          <Pressable onPress={openDetails} style={[s.symbol, { backgroundColor: t.accentTint, borderColor: t.border }]}><Icon name={printer ? "printer" : "box"} color={t.primaryText} size={20} /></Pressable>
          {name(printer ? row.modelo : undefined)}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Body muted>{printer ? "Potência média" : "Custo por unidade"}</Body><Body strong>{printer ? (row.watts ? decimal(row.watts) + " W" : "—") : reais(row.custo)}</Body></View>
        {printer && <Body muted>{"Aquecimento " + (row.aquecimento ?? 0) + " min"}</Body>}
      </>}
      {!!error && <Notice message={error} />}
    </Card>
    </Pressable>
  );
}
const s = StyleSheet.create({
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  identityText: { flex: 1, minWidth: 0, gap: 5 },
  name: { fontSize: 18, fontWeight: "500" },
  photo: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  symbol: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  material: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: "100%",
  },
  pill: {
    fontSize: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  dot: { width: 14, height: 14, borderWidth: 1, borderRadius: 7 },
  track: { flex: 1, height: 10, borderRadius: 8, overflow: "hidden" },
  warning: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    padding: 6,
    borderRadius: 16,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  action: {
    minWidth: 44,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
