import { pieceCalculation } from "@/features/calculation-route";
import { router } from "expo-router";
import { useCallback, useState, type ComponentProps } from "react";
import { useFocusEffect } from "expo-router";
import { ActivityIndicator, BackHandler, Pressable, Text, View } from "react-native";
import type { components } from "@/api/schema";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";
import { decimal, quantity, reais } from "@/features/format";
import { openWebsite } from "@/features/website";
import { Body, Button, Card, Notice, Screen } from "./ui";
import { Icon } from "./icon";
import { catalogPaths, PiecePhoto, MaterialChips, stockLevel, type CatalogCategory, type CatalogRow } from "./catalog-card";

type Glyph = ComponentProps<typeof Icon>["name"];
type Schemas = components["schemas"];
function Metric({ icon, label, value }: { icon: Glyph; label: string; value: string }) {
  const t = useTheme();
  return <Card style={{ flex: 1, minWidth: 0, minHeight: 70, justifyContent: "center", padding: 10, gap: 4, backgroundColor: t.accentTint, borderColor: t.accentTint }}>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}><Icon name={icon} size={13} color={t.primaryText} /><Text style={{ color: t.muted, fontSize: 11 }}>{label}</Text></View>
    <Text numberOfLines={1} style={{ color: t.text, fontSize: 16, fontWeight: "700" }}>{value}</Text>
  </Card>;
}
function Action({ label, icon, onPress, primary = false }: { label: string; icon: Glyph; onPress: () => void; primary?: boolean }) {
  const t = useTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ minHeight: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: primary ? 0 : 1, borderColor: t.border, backgroundColor: primary ? t.primary : t.surface, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, opacity: pressed ? 0.7 : 1 })}>
    <Icon name={icon} size={15} color={primary ? t.onPrimary : t.primaryText} /><Text style={{ color: primary ? t.onPrimary : t.primaryText, fontSize: 13, fontWeight: "600" }}>{label}</Text>
  </Pressable>;
}
function PieceFile({ row, onEdit }: { row: CatalogRow; onEdit: () => void }) {
  const t = useTheme();
  const q = useApiQuery<Schemas["ArquivoCatalogo"]>(row.id ? "/catalogo/pecas/" + encodeURIComponent(row.id) + "/arquivo" : null);
  if (q.loading) return <ActivityIndicator accessibilityLabel="Carregando arquivo da peça" color={t.primaryText} />;
  if (q.error) return <Notice message={q.error} onRetry={q.retry} />;
  const file = q.data;
  if (!file) return null;
  return <>
    <Card style={{ gap: 5 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}><View style={{ flex: 1 }}><Body muted>Arquivo 3D importado</Body><Body strong>{file.nomeArquivo}</Body><Body muted>{[file.modeloImpressora, file.fatiador, file.numeroPlacas != null ? file.numeroPlacas + (file.numeroPlacas === 1 ? " placa" : " placas") : undefined].filter(Boolean).join(" · ")}</Body></View><Pressable accessibilityRole="button" onPress={onEdit} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}><Icon name="arrow-repeat" size={14} color={t.primaryText} /><Text style={{ color: t.primaryText, fontSize: 12 }}>Trocar</Text></Pressable></View>
    </Card>
    {!!row.materiais?.length && <Card style={{ gap: 8 }}><Body strong>Materiais e cores</Body>{file.placas?.length ? file.placas.map((plate) => <View key={plate.numero} style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
      {plate.temImagem ? <PiecePhoto row={{ id: row.id, nome: row.nome + " · placa " + plate.numero, placaMiniatura: plate.numero }} medium /> : <View style={{ width: 64, height: 64, borderRadius: 11, backgroundColor: t.accentTint, alignItems: "center", justifyContent: "center" }}><Icon name="collection" color={t.muted} size={22} /></View>}
      <View style={{ flex: 1, gap: 3 }}><Body strong>{"Placa " + plate.numero}</Body><View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 14, rowGap: 2 }}>{plate.tempoSegundos != null && <Body muted>{Math.round(plate.tempoSegundos / 60) + " min"}</Body>}{plate.pesoGramas != null && <Body muted>{decimal(String(plate.pesoGramas), 1) + " g"}</Body>}</View><MaterialChips materiais={plate.materiais} /></View>
    </View>) : <MaterialChips materiais={row.materiais} />}<Body muted>ⓘ Tempo e consumo podem ser ajustados durante o cálculo.</Body></Card>}
  </>;
}

export function CatalogDetail({ onEdit, category, row, onBack }: { onEdit: (purchase?: boolean) => void; category: CatalogCategory; row: CatalogRow; onBack: () => void }) {
  const t = useTheme();
  const [error, setError] = useState("");
  const id = encodeURIComponent(row.id ?? ""), path = "/" + catalogPaths[category];
  const piece = category === "pecas", filament = category === "filamentos", printer = category === "impressoras", packageItem = category === "embalagens";
  const costs = useApiQuery<Schemas["CustosImpressora"]>(printer && id ? "/catalogo/impressoras/" + id + "/custos" : null);
  const c = costs.data, level = filament ? stockLevel(row) : undefined;
  useFocusEffect(useCallback(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]));
  function open(dest: string) { setError(""); void openWebsite(dest).catch(() => setError("Não foi possível abrir a tela.")); }
  const symbol = <View style={{ width: 58, height: 58, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: filament && row.codigoCor ? row.codigoCor : t.accentTint, borderWidth: 1, borderColor: t.border }}>
    {filament && row.codigoCor ? null : <Icon name={printer ? "printer" : "box"} size={24} color={t.primaryText} />}
  </View>;
  return <Screen>
    <Pressable accessibilityRole="button" onPress={onBack} style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 2 }}><Icon name="arrow-left" size={14} color={t.primaryText} /><Text style={{ color: t.primaryText, fontSize: 13 }}>{piece ? "Peças" : printer ? "Impressoras" : packageItem ? "Embalagens" : "Filamentos"}</Text></Pressable>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 11 }}>
      {symbol}
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text style={{ color: t.text, fontSize: 20, fontWeight: "700" }}>{row.nome}</Text>
        {piece && !!row.categoria && <Text style={{ alignSelf: "flex-start", overflow: "hidden", color: t.primaryText, backgroundColor: t.accentTint, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "600" }}>{row.categoria}</Text>}
        {filament && <Text style={{ color: t.muted, fontSize: 12 }}>{row.cor}</Text>}
        {printer && <Text style={{ color: t.muted, fontSize: 12 }}>{row.modelo}</Text>}
        {packageItem && <Text style={{ color: t.muted, fontSize: 12 }}>{row.usos ? `Usada em ${row.usos} cálculos` : "Ainda não usada"}</Text>}
      </View>
    </View>
    {piece && <>
      <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Action icon="calculator" label="Calcular preço" onPress={() => router.push(pieceCalculation(row))} /></View><Action icon="pencil" label="Editar" onPress={() => onEdit()} /></View>
      <View style={{ flexDirection: "row", gap: 8 }}><Metric icon="palette2" label="Filamento" value={formatMeasure(row.gramas, "g")} /><Metric icon="clock-history" label="Tempo" value={row.minutos == null ? "—" : row.minutos + " min"} /></View>
      {row.preco != null && <Card style={{ padding: 11, backgroundColor: t.accentTint, borderColor: t.accentTint, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><View><Body muted>Último preço sugerido</Body><Text style={{ color: t.text, fontSize: 19, fontWeight: "700" }}>{reais(row.preco)}</Text></View><Icon name="copy" size={18} color={t.muted} /></Card>}
      <PieceFile row={row} onEdit={() => onEdit()} />
    </>}
    {filament && <>
      <View style={{ flexDirection: "row", gap: 8 }}><View style={{ flex: 1 }}><Action icon="bag-plus" label="Registrar compra" onPress={() => onEdit(true)} /></View><Action icon="pencil" label="Editar" onPress={() => onEdit()} /></View>
      <Card style={{ gap: 7, backgroundColor: t.surface }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Body muted>Estoque disponível</Body>{level?.low && <Text style={{ color: t.danger, backgroundColor: t.dangerBackground, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3, fontSize: 11, fontWeight: "600" }}>Repor</Text>}</View>
        <Text style={{ color: level?.low ? t.danger : t.text, fontSize: 22, fontWeight: "700" }}>{quantity(row.estoque, "g")}</Text>
        <View accessibilityRole="progressbar" accessibilityValue={{ now: level?.percent ?? 0, min: 0, max: 100 }} style={{ height: 7, borderRadius: 8, overflow: "hidden", backgroundColor: t.border }}><View style={{ height: "100%", width: `${level?.percent ?? 0}%`, backgroundColor: level?.low ? t.danger : t.success }} /></View>
        <Body muted>{(level?.rolls ?? 0) + " rolos equivalentes"}</Body>
      </Card>
      <View style={{ flexDirection: "row", gap: 8 }}><Metric icon="disc" label="Peso do rolo" value={formatMeasure(row.pesoRolo, "g", 0)} /><Metric icon="cash-coin" label="Custo médio" value={reais(row.precoRolo)} /></View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}><Icon name="info-circle" size={15} color={t.primaryText} /><View style={{ flex: 1 }}><Body muted>O estoque muda quando você registra uma compra ou marca um cálculo como produzido.</Body></View></View>
      <Card style={{ paddingVertical: 0, gap: 0 }}>{["Ver uso no histórico", "Compras anteriores"].map((label, index) => <Pressable key={label} accessibilityRole="link" onPress={() => open(path + "/" + id + (index ? "/compras" : "/historico"))} style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, borderBottomWidth: index ? 0 : 1, borderColor: t.border }}><Icon name={index ? "file-text" : "clock-history"} size={17} color={t.primaryText} /><Text style={{ color: t.text, flex: 1, fontSize: 14 }}>{label}</Text><Text style={{ color: t.muted, fontSize: 21 }}>›</Text></Pressable>)}</Card>
    </>}
    {printer && <>
      <Action icon="pencil" label="Editar impressora" onPress={() => onEdit()} />
      <View style={{ flexDirection: "row", gap: 8 }}><Metric icon="lightning-charge" label="Potência média" value={formatMeasure(row.watts, "W", 0)} /><Metric icon="thermometer-half" label="Aquecimento" value={(row.aquecimento ?? 0) + " min"} /></View>
      {costs.loading ? <ActivityIndicator color={t.primaryText} /> : costs.error ? <Notice message={costs.error} onRetry={costs.retry} /> : <Card style={{ paddingVertical: 3, gap: 0 }}>{[["Depreciação por hora", c?.depreciacaoHora ? "R$ " + decimal(c.depreciacaoHora, 2) : "Preencher"], ["Horas até troca ou revenda", c?.vidaUtilHoras ? decimal(c.vidaUtilHoras, 0) + " h" : "Preencher"], ["Uso mensal estimado", c?.horasMensais ? decimal(c.horasMensais, 1) + " h/mês" : "Ainda não estimado"]].map(([label, value], i) => <Pressable key={label} onPress={() => onEdit()} style={{ minHeight: 41, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderBottomWidth: i === 2 ? 0 : 1, borderColor: t.border }}><Text style={{ color: t.text, fontSize: 12, flex: 1 }}>{label}</Text><Text style={{ color: value === "Preencher" ? "#A66A00" : t.muted, backgroundColor: value === "Preencher" ? "#FFF1C2" : t.accentTint, borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, fontSize: 10 }}>{value}</Text></Pressable>)}</Card>}
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}><Icon name="info-circle" size={15} color={t.primaryText} /><View style={{ flex: 1 }}><Body muted>Potência e tempos alimentam as estimativas de custo.</Body></View></View>
      {c && <Card style={{ gap: 8 }}><Body strong>Manutenção</Body>
        <View style={{ flexDirection: "row", gap: 8 }}><Metric icon="clock-history" label="Horas impressas" value={formatMeasure(((c.minutosImpressos ?? 0) / 60).toFixed(2), "h")} /><Metric icon="cash-coin" label="Total gasto" value={reais(c.gastoTotal)} /></View>
        <View style={{ flexDirection: "row", justifyContent: "space-between" }}><Body muted>Estimativa por hora de uso</Body><Body strong>{reais(c.manutencaoHora)}/h</Body></View>
        {c.registros?.map((g) => <View key={g.id} style={{ borderTopWidth: 1, borderColor: t.border, paddingTop: 7, flexDirection: "row", justifyContent: "space-between" }}><View style={{ flex: 1 }}><Body strong>{g.descricao}</Body><Body muted>{g.data?.split("-").reverse().join("/")}</Body></View><Body strong>{reais(g.valor)}</Body></View>)}
        <Action icon="bag-plus" label="Registrar manutenção" onPress={() => open(path + "/detalhes/" + id)} />
      </Card>}
    </>}
    {packageItem && <>
      <Action icon="pencil" label="Editar embalagem" onPress={() => onEdit()} />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Metric icon="cash-coin" label="Custo por unidade" value={reais(row.custo)} />
        <Metric icon="box" label="Aplicação" value="Por peça calculada" />
      </View>
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6 }}><Icon name="info-circle" size={15} color={t.primaryText} /><View style={{ flex: 1 }}><Body muted>Mudar o custo não altera cálculos já salvos.</Body></View></View>
    </>}
    {!!error && <Notice message={error} />}
  </Screen>;
}

function formatMeasure(value: string | undefined, unit: string, places = 2) {
  return value == null ? "Não informado" : decimal(value, places) + " " + unit;
}
