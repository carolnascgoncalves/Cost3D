import { useCallback, useState } from "react";
import { useFocusEffect, router, useLocalSearchParams } from "expo-router";
import {
  SavedCalculation,
  CalculationForm,
  CalculationHistory,
} from "@/features/mobile-calculations";
import { MenuCard } from "@/components/menu-card";
import { type IconName } from "@/components/icon";
import { ModuleScreen } from "@/components/module-screen";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { Body, Card, Notice } from "@/components/ui";
import { useApiQuery } from "@/hooks/use-api-query";
import type { components } from "@/api/schema";
import { useTheme } from "@/theme/provider";
import { reais } from "@/features/format";

const options: {
  label: string;
  description: string;
  icon: IconName;
  mode: string;
}[] = [
  {
    label: "Calcular e salvar",
    description: "Guarda o resultado no seu histórico.",
    icon: "calculator",
    mode: "salvar",
  },
  {
    label: "Consultar sem salvar",
    description: "Estimativa rápida, nada é guardado.",
    icon: "lightning-charge",
    mode: "rapido",
  },
];
type HistoryPage = components["schemas"]["PaginaResponseHistoricoListaResponse"];
function CalculationHub() {
  const t = useTheme();
  const q = useApiQuery<HistoryPage>("/calculos?pagina=0&busca=&status=");
  const recent = q.data?.itens?.slice(0, 5) ?? [];
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  const yesterday = new Date(new Date(today + "T12:00:00-03:00").getTime() - 86400000).toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const dateLabel = (value?: string) => {
    const date = value?.slice(0, 10);
    if (!date) return "Cálculo recente";
    if (date === today) return "Hoje";
    if (date === yesterday) return "Ontem";
    const parsed = new Date(date + "T12:00:00Z");
    return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", timeZone: "UTC" }).replace(".", "");
  };
  return <ModuleScreen lightHeader section="Cost3D" title="Calcular">
    <Body muted>Descubra quanto cobrar por uma peça.</Body>
    {options.slice(0, 2).map(({ mode, ...option }, index) => <MenuCard key={mode} {...option} primary={index === 0} onPress={() => router.setParams({ modo: mode, peca: "" })} />)}
    <View style={{ height: 8 }} />
    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4, paddingVertical: 4 }}><Body strong>Últimos cálculos</Body><Pressable accessibilityRole="button" onPress={() => router.setParams({ modo: "historico" })}><Text style={{ color: t.primaryText, fontSize: 13, fontWeight: "600" }}>Ver todos</Text></Pressable></View>
    {q.loading ? <ActivityIndicator color={t.primaryText} /> : q.error ? <Notice message={q.error} onRetry={q.retry} /> : recent.length ? <Card style={{ paddingVertical: 4, paddingHorizontal: 12, gap: 0 }}>{recent.map((item, index) => <Pressable key={item.id} accessibilityRole="button" onPress={() => router.setParams({ modo: "detalhe", id: item.id })} style={{ minHeight: 61, flexDirection: "row", alignItems: "center", gap: 9, borderBottomWidth: index === recent.length - 1 ? 0 : 1, borderColor: t.border }}><View style={{ flex: 1, minWidth: 0, gap: 2 }}><Body strong>{item.nomePeca}</Body><Body muted>{dateLabel(item.dataCalculo)} · {item.unidades ?? 1} un.</Body></View><View style={{ alignItems: "flex-end", gap: 2 }}><Body strong>{reais(item.precoVendaPlataforma == null && item.precoSugerido == null ? undefined : String(item.precoVendaPlataforma ?? item.precoSugerido))}</Body><Text style={{ color: item.vendido ? "#2784DB" : item.produzido ? t.success : t.muted, backgroundColor: item.vendido ? "#2784DB18" : item.produzido ? t.success + "18" : t.accentTint, borderRadius: 7, paddingHorizontal: 6, paddingVertical: 2, fontSize: 10 }}>{item.vendido ? "Vendido" : item.produzido ? "Em estoque" : "Só cálculo"}</Text></View></Pressable>)}</Card> : <Body muted>Seus cálculos recentes aparecerão aqui.</Body>}
  </ModuleScreen>;
}
function routeMaterials(raw?: string) {
  try {
    const rows = JSON.parse(raw ?? "[]");
    return Array.isArray(rows)
      ? rows.filter(
          (m) =>
            m &&
            typeof m.pesoGramas === "number" &&
            m.pesoGramas > 0 &&
            (m.material == null || typeof m.material === "string") &&
            (m.corHex == null || typeof m.corHex === "string"),
        )
      : [];
  } catch {
    return [];
  }
}
export default function Calculate() {
  const { modo, id, peca, nome, gramas, minutos, materiais, placa } =
    useLocalSearchParams<{
      modo?: string;
      id?: string;
      peca?: string;
      nome?: string;
      gramas?: string;
      materiais?: string;
      minutos?: string;
      placa?: string;
    }>();
  const [focused, setFocused] = useState(true);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  if (modo === "rapido" && !focused) return null;
  if (modo === "detalhe" && id) return <SavedCalculation id={id} />;
  if (modo === "historico") return <CalculationHistory />;
  if (modo === "salvar" || modo === "rapido")
    return (
      <CalculationForm
        key={modo + (peca ?? "")}
        quick={modo === "rapido"}
        initial={
          peca
            ? {
                id: peca,
                nome,
                materiais: routeMaterials(materiais),
                gramas,
                minutos: minutos ? Number(minutos) : undefined,
                placaMiniatura: placa ? Number(placa) : undefined,
              }
            : undefined
        }
      />
    );
  return <CalculationHub />;
}
