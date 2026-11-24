import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { components } from "@/api/schema";
import { request } from "@/api/session";
import { useApiQuery } from "@/hooks/use-api-query";
import { ModuleScreen } from "@/components/module-screen";
import { Icon, type IconName } from "@/components/icon";
import { Body, Button, Card, Field, Notice } from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { EnergyReference } from "@/features/settings-energy";

type Config = components["schemas"]["ConfiguracaoRequest"];
const groups = [
  ["preco", "Preço e lucro", "cash-coin"],
  ["energia", "Energia", "lightning-charge"],
  ["embalagem", "Embalagem", "box"],
  ["formulario", "Formulário avançado", "gear"],
  ["purga", "Purga de filamento", "palette"],
  ["mao", "Mão de obra", "clock-history"],
  ["depreciacao", "Depreciação", "printer"],
  ["falhas", "Falhas e desperdício", "warning"],
] as const satisfies readonly (readonly [string, string, IconName])[];
type Section = (typeof groups)[number][0];
const numericFields = {
  markupPercentual: ["preco", "Markup fixo (%)"],
  markupOpcao1: ["preco", "Atalho 1 (%)"],
  markupOpcao2: ["preco", "Atalho 2 (%)"],
  markupOpcao3: ["preco", "Atalho 3 (%)"],
  tarifaEnergiaKwh: ["energia", "Tarifa de energia (R$/kWh)"],
  custoEmbalagemFixa: ["embalagem", "Custo por unidade (R$)"],
  purgaGramasPorImpressao: ["purga", "Purga por impressão (g)"],
  valorMaoObraHora: ["mao", "Valor da hora de trabalho (R$)"],
  tempoMaoObraFixoMinutos: ["mao", "Tempo fixo por unidade (min)"],
  percentualFalha: ["falhas", "Margem para falhas (%)"],
} as const;
type Num = keyof typeof numericFields;
type Flag =
  | "markupFixo"
  | "embalagemFixa"
  | "formularioAvancado"
  | "maoObraAtivada"
  | "maoObraTempoFixo"
  | "depreciacaoAtivada"
  | "taxaFalhaAtivada";
const numericKeys = Object.keys(numericFields) as Num[];
function strings(c: Config) {
  return Object.fromEntries(
    numericKeys.map((k) => [k, String(c[k] ?? "").replace(".", ",")]),
  ) as Record<Num, string>;
}
export default function Settings() {
  const q = useApiQuery<Config>("/configuracao");
  const { secao } = useLocalSearchParams<{ secao?: string }>();
  if (q.data && !q.loading && !q.error) {
    return (
      <SettingsForm
        initial={q.data}
        first={groups.find(([k]) => k === secao)?.[0] ?? "preco"}
      />
    );
  }
  return (
    <ModuleScreen
      lightHeader
      section="Mais"
      title="Configurações"
      onBack={back}
    >
      {q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <ActivityIndicator />
      )}
    </ModuleScreen>
  );
}
function back() {
  if (router.canGoBack()) router.back();
  else router.replace("/more");
}
function SettingsForm({ initial, first }: { initial: Config; first: Section }) {
  const t = useTheme(),
    [section, setSection] = useState<Section | null>(first),
    [config, setConfig] = useState(initial),
    [values, setValues] = useState(() => strings(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const lock = useRef(false);
  function changed() {
    setSaved(false);
    setError("");
  }
  function update(key: Num, v: string) {
    changed();
    setValues((prev) => ({ ...prev, [key]: v }));
  }
  function field(key: Num) {
    return (
      <Field
        label={numericFields[key][1]}
        keyboardType={
          key === "tempoMaoObraFixoMinutos" ? "number-pad" : "decimal-pad"
        }
        value={values[key]}
        onChangeText={(v) => update(key, v)}
      />
    );
  }
  function toggle(key: Flag, label: string) {
    return (
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Body strong>{label}</Body>
        </View>
        <Switch
          accessibilityLabel={label}
          value={!!config[key]}
          trackColor={{ true: t.primary }}
          onValueChange={(v) => {
            changed();
            setConfig((prev) => ({ ...prev, [key]: v }));
          }}
        />
      </View>
    );
  }
  function active(key: Num) {
    switch (key) {
      case "markupPercentual":
        return config.markupFixo;
      case "custoEmbalagemFixa":
        return config.embalagemFixa;
      case "valorMaoObraHora":
        return config.maoObraAtivada;
      case "tempoMaoObraFixoMinutos":
        return config.maoObraAtivada && config.maoObraTempoFixo;
      case "percentualFalha":
        return config.taxaFalhaAtivada;
      default:
        return true;
    }
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data = { ...config };
      for (const key of numericKeys) {
        if (!active(key)) continue;
        const raw = values[key].trim().replace(",", ".");
        const precision =
          key === "purgaGramasPorImpressao"
            ? 6
            : key === "tempoMaoObraFixoMinutos"
              ? 0
              : 2;
        const num = Number(raw);
        if (
          !/^\d+(\.\d+)?$/.test(raw) ||
          (raw.split(".")[1]?.length ?? 0) > precision ||
          !Number.isSafeInteger(Math.trunc(num)) ||
          (key === "percentualFalha"
            ? num > 100
            : key === "tempoMaoObraFixoMinutos"
              ? false
              : key === "purgaGramasPorImpressao"
                ? num >= 1e6
                : num >= 1e8)
        ) {
          setSection(numericFields[key][0]);
          throw new Error(
            "Confira o campo “" +
              numericFields[key][1] +
              "”. Informe " +
              (key === "percentualFalha"
                ? "um percentual entre 0 e 100."
                : precision
                  ? "um valor positivo ou zero com até " +
                    precision +
                    " casas decimais."
                  : "um número inteiro de minutos igual ou maior que zero."),
          );
        }
        data[key] = num;
      }
      const result = await request<Config>("/configuracao", {
        method: "PUT",
        body: JSON.stringify(data),
      });
      setConfig(result);
      setValues(strings(result));
      setSaved(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível salvar as configurações.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function content(k: Section) {
    switch (k) {
      case "preco":
        return (
          <>
            {toggle("markupFixo", "Usar o mesmo markup em todos os cálculos")}
            {config.markupFixo && field("markupPercentual")}
            <Body strong>Atalhos de markup</Body>
            <Body muted>
              Estes atalhos aparecem quando o markup é variável. Com 50%, uma
              peça de R$ 10 custa R$ 15 para o cliente antes das taxas.
            </Body>
            {field("markupOpcao1")}
            {field("markupOpcao2")}
            {field("markupOpcao3")}
          </>
        );
      case "energia":
        return (
          <>
            {field("tarifaEnergiaKwh")}
            <EnergyReference apply={(v) => update("tarifaEnergiaKwh", v)} />
          </>
        );
      case "embalagem":
        return (
          <>
            {toggle("embalagemFixa", "Usar custo fixo de embalagem")}
            {config.embalagemFixa ? (
              field("custoEmbalagemFixa")
            ) : (
              <Body muted>
                Escolha a embalagem do catálogo em cada cálculo.
              </Body>
            )}
          </>
        );
      case "formulario":
        return (
          <>
            {toggle("formularioAvancado", "Ativar formulário avançado")}
            <Body muted>
              Permite ajustar taxas e condições da plataforma de venda.
            </Body>
          </>
        );
      case "purga":
        return (
          <>
            {field("purgaGramasPorImpressao")}
            <Body muted>
              Use a média indicada pelo fatiador. Informe 0 para impressões sem
              purga.
            </Body>
          </>
        );
      case "mao":
        return (
          <>
            {toggle("maoObraAtivada", "Incluir mão de obra")}
            {config.maoObraAtivada && (
              <>
                {field("valorMaoObraHora")}
                {toggle("maoObraTempoFixo", "Usar um tempo fixo")}
                {config.maoObraTempoFixo && field("tempoMaoObraFixoMinutos")}
                <Body muted>
                  Conte o tempo de preparo, acabamento e embalagem da peça.
                </Body>
              </>
            )}
          </>
        );
      case "depreciacao":
        return (
          <>
            {toggle("depreciacaoAtivada", "Incluir depreciação da impressora")}
            <Body muted>
              Usa a depreciação por hora da impressora selecionada.
            </Body>
          </>
        );
      case "falhas":
        return (
          <>
            {toggle(
              "taxaFalhaAtivada",
              "Incluir margem para falhas e desperdício",
            )}
            {config.taxaFalhaAtivada && field("percentualFalha")}
            <Body muted>
              A margem incide sobre filamento e energia para cobrir
              reimpressões.
            </Body>
          </>
        );
    }
  }
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        lightHeader
        section="Mais"
        title="Configurações"
        onBack={back}
      >
        <View pointerEvents={busy ? "none" : "auto"} style={{ gap: 10 }}>
          {groups.map(([key, label, icon]) => (
            <Card key={key}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: key === section }}
                onPress={() => setSection(key === section ? null : key)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  minHeight: 44,
                }}
              >
                <View
                  style={{
                    borderRadius: 10,
                    padding: 9,
                    backgroundColor: t.accentTint,
                  }}
                >
                  <Icon name={icon} color={t.primaryText} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Body strong>{label}</Body>
                </View>
                <View
                  style={{
                    transform: [
                      { rotate: section === key ? "-90deg" : "90deg" },
                    ],
                  }}
                >
                  <Icon name="chevron-right" color={t.muted} size={14} />
                </View>
              </Pressable>
              {key === section && content(key)}
            </Card>
          ))}
        </View>
      </ModuleScreen>
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 6,
          borderTopWidth: 1,
          borderColor: t.border,
          backgroundColor: t.surface,
        }}
      >
        {!!error && <Notice message={error} />}
        {saved && <Body strong>Configurações salvas.</Body>}
        <Button
          label="Salvar configurações"
          busy={busy}
          disabled={busy}
          onPress={() => void save()}
        />
      </View>
    </View>
  );
}
