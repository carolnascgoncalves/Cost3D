import { router, useLocalSearchParams } from "expo-router";
import {
  SavedCalculation,
  CalculationForm,
  CalculationHistory,
} from "@/features/mobile-calculations";
import { Pressable, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { ModuleScreen } from "@/components/module-screen";
import { useTheme } from "@/theme/provider";

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
export default function Calculate() {
  const t = useTheme();
  const { modo, id, peca, nome, gramas, minutos } = useLocalSearchParams<{
    modo?: string;
    id?: string;
    peca?: string;
    nome?: string;
    gramas?: string;
    minutos?: string;
  }>();
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
                gramas,
                minutos: minutos ? Number(minutos) : undefined,
              }
            : undefined
        }
      />
    );
  return (
    <ModuleScreen section="Cost3D" title="Calcular">
      {options.map(({ label, description, icon, mode }, index) => {
        const primary = index === 0;
        const ink = primary ? t.onPrimary : t.primaryText;
        return (
          <Pressable
            key={mode}
            accessibilityRole="link"
            onPress={() => router.setParams({ modo: mode, peca: "" })}
            style={({ pressed }) => ({
              flexDirection: "row",
              gap: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: primary ? t.primary : t.border,
              backgroundColor: primary ? t.primary : t.surface,
              borderRadius: 14,
              padding: 16,
              minHeight: 84,
              opacity: pressed ? 0.75 : 1,
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                backgroundColor: primary ? t.surface : t.accentTint,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name={icon} size={24} color={t.primaryText} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontSize: 17, fontWeight: "700", color: ink }}>
                {label}
              </Text>
              <Text style={{ fontSize: 13, color: primary ? ink : t.muted }}>
                {description}
              </Text>
            </View>
            <Icon name="chevron-right" color={ink} size={16} />
          </Pressable>
        );
      })}
    </ModuleScreen>
  );
}
