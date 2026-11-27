import { Pressable, Text, View } from "react-native";
import { Image } from "expo-image";
import { Body, Card } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { useTheme } from "@/theme/provider";
import type { Theme } from "@/theme/colors";
import { reais } from "./format";
export type Summary = {
  id: string;
  codigo: string;
  titulo: string;
  pecasResumo?: string;
  cliente?: string;
  contato?: string;
  email?: string;
  compradorId?: string;
  situacao: string;
  status: string;
  arquivado: boolean;
  pago: boolean;
  revisao: number;
  criado: string;
  total: number;
};
export type RefPiece = {
  id: string;
  nome: string;
  material: string;
  impressora: string;
  disponivel: number;
  preco: number;
};
export type Line = {
  id?: string;
  referencia: string | null;
  nome: string;
  material: string;
  quantidade: number;
  estoque: number;
  livre: number;
  preco: number;
  pronto?: boolean;
};
export type DataForm = {
  titulo: string;
  cliente: string;
  compradorId?: string;
  contato: string;
  email: string;
  observacoes: string;
  inicioPretendido: string;
  turnoInicio: string;
  turnoFim: string;
  dias: string;
  intervalo: number;
  folga: number;
  descontoInformado: string;
  frete: number;
  custoFrete: number;
};
export type Detail = {
  resumo: Summary;
  itens: Line[];
  dados: DataForm;
  subtotal: number;
  desconto: number;
  custo: number;
  taxas: number;
  resultado: { estado: string; titulo: string; lucro: number; margem: number };
  previsao?: string;
  linhas: {
    itemId?: string;
    fim?: string;
    impressoes: { inicio: string; fim: string; minutosFolga: number }[];
  }[];
  ocupacoes: {
    nome: string;
    impressora: string;
    inicio: string;
    fim: string;
  }[];
  materiais?: {
    materiais: {
      nome: string;
      cor: string;
      codigoCor?: string;
      necessario: number;
      falta: number;
    }[];
    reposicao: number;
  };
  aviso?: string;
};
export const money = (n: number) => reais(Number(n || 0).toFixed(2));
export function statusBadge(status: string, paid: boolean, t: Theme) {
  if (paid) return { fg: t.success, bg: "#E5F3E8" };
  if (status === "RASCUNHO") return { fg: t.muted, bg: t.accentTint };
  if (status === "ENVIADO") return { fg: "#285B91", bg: "#E4F0FF" };
  if (status === "APROVADO" || status === "PRODUZINDO") return { fg: "#765700", bg: "#FFF1C2" };
  if (status === "PRONTO") return { fg: t.success, bg: "#E5F3E8" };
  if (status === "ENTREGUE") return { fg: "#27663F", bg: "#DFF2E5" };
  if (status === "CANCELADO") return { fg: t.danger, bg: t.dangerBackground };
  return { fg: t.primaryText, bg: t.accentTint };
}
export const row = {
  flexDirection: "row" as const,
  alignItems: "center" as const,
  gap: 8,
};
export const stamp = (s?: string) =>
  s
    ? s.slice(8, 10) + "/" + s.slice(5, 7) + " · " + s.slice(11, 16)
    : "A confirmar";
export function PieceMark() {
  return (
    <Image
      cachePolicy="memory-disk"
      contentFit="cover"
      transition={0}
      source={require("../../assets/images/cost3d-icone-marsala.png")}
      style={{ width: 36, height: 36, borderRadius: 8 }}
    />
  );
}
export function Avatar({ name, size = 28 }: { name?: string; size?: number }) {
  const t = useTheme();
  return (
    <Text
      style={{
        backgroundColor: t.primary,
        color: t.onPrimary,
        width: size,
        height: size,
        lineHeight: size,
        textAlign: "center",
        borderRadius: size / 2,
        overflow: "hidden",
        fontWeight: "700",
      }}
    >
      {name?.trim()[0]?.toUpperCase() || "?"}
    </Text>
  );
}
export function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: IconName;
}) {
  const t = useTheme();
  return (
    <Card style={{ flex: 1, gap: 3, padding: 10 }}>
      {icon && <Icon name={icon} color={t.primaryText} size={15} />}
      <Body strong>{value}</Body>
      <Body muted>{label}</Body>
    </Card>
  );
}
export function Stepper({
  label,
  value,
  max,
  min = 0,
  change,
}: {
  label: string;
  value: number;
  max: number;
  min?: number;
  change: (v: number) => void;
}) {
  const t = useTheme();
  return (
    <View style={row}>
      <View style={{ flex: 1 }}>
        <Body>{label}</Body>
      </View>
      {[-1, 0, 1].map((d) =>
        d ? (
          <Pressable
            key={d}
            accessibilityLabel={(d < 0 ? "Diminuir " : "Aumentar ") + label}
            accessibilityRole="button"
            disabled={value + d < min || value + d > max}
            onPress={() => change(value + d)}
            style={{
              width: 34,
              minHeight: 36,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: t.border,
              borderRadius: 8,
            }}
          >
            <Body>{d < 0 ? "−" : "+"}</Body>
          </Pressable>
        ) : (
          <Body key="value" strong>
            {value}
          </Body>
        ),
      )}
    </View>
  );
}
export function Steps({ step }: { step: number }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row" }}>
      {(
        ["person", "clock-history", "cash-coin", "file-text"] as IconName[]
      ).map((icon, i) => (
        <View key={icon} style={{ flex: 1, alignItems: "center", gap: 5 }}>
          {i < 3 && (
            <View
              style={{
                position: "absolute",
                left: "50%",
                width: "100%",
                height: 2,
                top: 18,
                backgroundColor: i < step ? t.header : t.border,
              }}
            />
          )}
          <View
            style={{
              width: 37,
              height: 37,
              borderRadius: 19,
              borderWidth: i === step ? 2 : 0,
              borderColor: t.header,
              backgroundColor: i < step ? t.header : t.accentTint,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ color: i < step ? t.onPrimary : t.text, fontWeight: i === step ? "700" : "500", fontSize: 14 }}>{i < step ? "✓" : i + 1}</Text>
          </View>
          <Text
            style={{
              textAlign: "center",
              color: t.text,
              fontSize: 10,
              fontWeight: i === step ? "700" : "400",
            }}
          >
            {["Cliente e peças", "Prazo", "Preço", "Revisar e enviar"][i]}
          </Text>
        </View>
      ))}
    </View>
  );
}
