import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { components } from "@/api/schema";
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { decimal, reais } from "@/features/format";
import { openWebsite } from "@/features/website";
import { Body, Button, Card, Notice } from "./ui";

type Schemas = components["schemas"];
export type CatalogRow = Schemas["PecaCatalogo"] &
  Schemas["ImpressoraCatalogo"] &
  Schemas["FilamentoCatalogo"] &
  Schemas["EmbalagemCatalogo"];
type Category = "pecas" | "filamentos" | "impressoras" | "embalagens";
const paths = {
  pecas: "peca",
  filamentos: "filamento",
  impressoras: "impressora",
  embalagens: "embalagem",
};
const icons = {
  printer: require("../../assets/images/catalogo/printer.png"),
  box: require("../../assets/images/catalogo/box-seam.png"),
  palette: require("../../assets/images/catalogo/palette.png"),
  eye: require("../../assets/images/catalogo/eye.png"),
  pencil: require("../../assets/images/catalogo/pencil.png"),
  warning: require("../../assets/images/catalogo/exclamation-triangle.png"),
};
function Icon({
  name,
  size = 22,
  color,
}: {
  name: keyof typeof icons;
  size?: number;
  color: string;
}) {
  return (
    <Image
      accessible={false}
      resizeMode="contain"
      source={icons[name]}
      style={{ width: size, height: size, tintColor: color }}
    />
  );
}
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
function PiecePhoto({ row }: { row: CatalogRow }) {
  const t = useTheme();
  const photo = useApiQuery<Schemas["FotoCatalogo"]>(
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
      style={[s.photo, { backgroundColor: t.surface, borderColor: t.border }]}
    >
      {photo.data?.base64 && !failed ? (
        <Image
          accessibilityLabel={"Foto de " + row.nome}
          resizeMode="contain"
          style={{ width: "100%", height: "100%" }}
          source={{
            uri: "data:" + photo.data.tipo + ";base64," + photo.data.base64,
          }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Icon name="box" color={t.muted} size={28} />
      )}
    </View>
  );
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
        {!!row.materiais?.length && (
          <View style={s.chips}>
            {row.materiais.map((m, index) => (
              <View key={index} style={[s.material, { borderColor: t.border }]}>
                {!!m.corHex && (
                  <View
                    style={[
                      s.dot,
                      { backgroundColor: m.corHex, borderColor: t.border },
                    ]}
                  />
                )}
                <Text style={{ flexShrink: 1, color: t.text, fontSize: 13 }}>
                  {m.material || "Material"} ·{" "}
                  {decimal(String(m.pesoGramas), 1)} g
                </Text>
              </View>
            ))}
          </View>
        )}
        {!!row.modeloImpressora && <Body muted>{row.modeloImpressora}</Body>}
      </View>
    </View>
  );
}
export function CatalogCard({
  category,
  row,
  onPiece,
  detail = false,
}: {
  category: Category;
  row: CatalogRow;
  onPiece?: () => void;
  detail?: boolean;
}) {
  const t = useTheme();
  const [error, setError] = useState("");
  const id = row.id && encodeURIComponent(row.id);
  const path = "/" + paths[category];
  const filament = category === "filamentos";
  const printer = category === "impressoras";
  const level = stockLevel(row);
  const stockColor = level?.low
    ? t.danger
    : level && level.percent <= 64
      ? "#916424"
      : t.success;
  function open(path: string) {
    setError("");
    void openWebsite(path).catch(() =>
      setError("Não foi possível abrir o site."),
    );
  }
  function action(name: "eye" | "pencil", label: string, onPress: () => void) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label + " " + row.nome}
        onPress={onPress}
        style={({ pressed }) => [
          s.action,
          { borderColor: t.border, opacity: pressed ? 0.65 : 1 },
        ]}
      >
        <Icon name={name} size={20} color={t.primaryText} />
      </Pressable>
    );
  }
  return (
    <Card style={{ gap: 16, padding: 16 }}>
      {category === "pecas" ? (
        <>
          {onPiece ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={"Ver detalhes de " + row.nome}
              onPress={onPiece}
            >
              <PieceIdentity row={row} />
            </Pressable>
          ) : (
            <PieceIdentity row={row} />
          )}
          <Metric
            label="Último preço sugerido"
            value={row.preco != null ? reais(row.preco) : "Ainda não calculado"}
          />
          <Metric
            label="Filamento"
            value={row.gramas != null ? decimal(row.gramas, 2) + " g" : "—"}
          />
          <Metric
            label="Impressão"
            value={row.minutos != null ? row.minutos + " min" : "—"}
          />
        </>
      ) : (
        <>
          <View style={s.identity}>
            <View
              style={[
                s.symbol,
                {
                  borderColor: t.border,
                  backgroundColor:
                    filament && row.codigoCor ? row.codigoCor : t.accentTint,
                },
              ]}
            >
              {(!filament || !row.codigoCor) && (
                <Icon
                  name={printer ? "printer" : filament ? "palette" : "box"}
                  color={t.primaryText}
                />
              )}
            </View>
            <View style={s.identityText}>
              {!filament && (
                <Text
                  style={{
                    fontSize: 11,
                    letterSpacing: 1.2,
                    color: t.muted,
                    fontWeight: "700",
                  }}
                >
                  {printer ? "IMPRESSORA" : "EMBALAGEM"}
                </Text>
              )}
              <Text style={[s.name, { color: t.text }]}>{row.nome}</Text>
              <Body muted>
                {filament
                  ? [row.marca, row.cor].filter(Boolean).join(" · ")
                  : printer
                    ? row.modelo
                    : "Usada em " + (row.usos ?? 0) + " cálculo(s)"}
              </Body>
            </View>
          </View>
          {filament ? (
            <>
              <Metric
                label="Estoque disponível"
                value={
                  row.estoque == null
                    ? "—"
                    : decimal(row.estoque, 2) +
                      " g" +
                      (level
                        ? " · " + level.rolls + " rolo(s) equivalentes"
                        : "")
                }
              />
              {level && (
                <View style={{ gap: 8 }}>
                  <View style={s.identity}>
                    <View
                      accessibilityRole="progressbar"
                      accessibilityLabel="Estoque disponível"
                      accessibilityValue={{
                        now: level.percent,
                        min: 0,
                        max: 100,
                      }}
                      style={[s.track, { backgroundColor: t.accentTint }]}
                    >
                      <View
                        style={{
                          width: `${level.percent}%`,
                          height: "100%",
                          backgroundColor: stockColor,
                        }}
                      />
                    </View>
                    <Text style={{ color: stockColor, fontWeight: "700" }}>
                      {level.percent}%
                    </Text>
                  </View>
                  {level.low && (
                    <View
                      style={[
                        s.warning,
                        { backgroundColor: t.dangerBackground },
                      ]}
                    >
                      <Icon name="warning" size={15} color={t.danger} />
                      <Text style={{ color: t.danger, fontWeight: "700" }}>
                        Repor estoque
                      </Text>
                    </View>
                  )}
                </View>
              )}
              <Metric label="Preço do rolo" value={reais(row.precoRolo)} />
            </>
          ) : printer ? (
            <>
              <Metric
                label="Potência média informada"
                value={row.watts != null ? decimal(row.watts, 2) + " W" : "—"}
              />
              <Metric
                label="Aquecimento"
                value={row.aquecimento != null ? row.aquecimento + " min" : "—"}
              />
            </>
          ) : (
            <Metric label="Custo unitário" value={reais(row.custo)} />
          )}
        </>
      )}
      {!!id && (
        <View style={s.actions}>
          {category === "pecas" && (
            <Button
              label="Calcular"
              onPress={() => open("/historico/novo?pecaCriada=" + id)}
            />
          )}
          {!detail &&
            action(
              "eye",
              "Ver detalhes de",
              onPiece ?? (() => open(path + "/detalhes/" + id)),
            )}
          {action("pencil", "Editar", () => open(path + "/editar/" + id))}
          {filament && (
            <Button
              variant="secondary"
              label="Registrar compra"
              onPress={() => open(path + "/compra/" + id)}
            />
          )}
        </View>
      )}
      {!!error && <Notice message={error} />}
    </Card>
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
