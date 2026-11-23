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

const options: {
  label: string;
  description: string;
  icon: IconName;
  mode: string;
}[] = [
  {
    label: "Calcular e salvar",
    description: "Calcule o preço da peça e guarde o resultado.",
    icon: "calculator",
    mode: "salvar",
  },
  {
    label: "Consultar sem salvar",
    description: "Faça uma estimativa rápida de custo.",
    icon: "lightning-charge",
    mode: "rapido",
  },
  {
    label: "Meus cálculos",
    description: "Reabra um cálculo do seu histórico.",
    icon: "clock-history",
    mode: "historico",
  },
];
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
  const { modo, id, peca, nome, gramas, minutos, materiais } =
    useLocalSearchParams<{
      modo?: string;
      id?: string;
      peca?: string;
      nome?: string;
      gramas?: string;
      materiais?: string;
      minutos?: string;
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
              }
            : undefined
        }
      />
    );
  return (
    <ModuleScreen lightHeader section="Cost3D" title="Calcular">
      {options.map(({ mode, ...option }, index) => (
        <MenuCard
          key={mode}
          {...option}
          primary={index === 0}
          onPress={() => router.setParams({ modo: mode, peca: "" })}
        />
      ))}
    </ModuleScreen>
  );
}
