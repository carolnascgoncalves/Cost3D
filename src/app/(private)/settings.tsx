import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import type { components } from "@/api/schema";
import { request } from "@/api/session";
import { useApiQuery } from "@/hooks/use-api-query";
import { ModuleScreen } from "@/components/module-screen";
import { Icon, type IconName } from "@/components/icon";
import {
  Body,
  Button,
  Card,
  Field,
  Notice,
  OptionalBadge,
} from "@/components/ui";
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
const effects: Record<Flag, string> = {
  markupFixo: "Desligado, você escolhe o markup a cada cálculo.",
  embalagemFixa: "Aplica o mesmo custo de embalagem a cada unidade.",
  formularioAvancado:
    "Exibe taxas e condições adicionais da plataforma na etapa de venda.",
  maoObraAtivada: "Soma o seu trabalho manual ao custo da peça.",
  maoObraTempoFixo: "Repete os mesmos minutos em cada peça.",
  depreciacaoAtivada: "Considera o desgaste da impressora durante a impressão.",
  taxaFalhaAtivada:
    "Reserva parte do custo de filamento e energia para reimpressões.",
};
const sections: [string, Section[]][] = [
  ["Preço", ["preco"]],
  ["Custos da impressão", ["energia", "mao", "depreciacao", "purga", "falhas"]],
  ["Venda e embalagem", ["embalagem", "formulario"]],
];
const currency = (n?: number) =>
  (n ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
        first={groups.find(([k]) => k === secao)?.[0] ?? null}
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
function SettingsForm({
  initial,
  first,
}: {
  initial: Config;
  first: Section | null;
}) {
  const t = useTheme(),
    [section, setSection] = useState<Section | null>(first),
    [config, setConfig] = useState(initial),
    [values, setValues] = useState(() => strings(initial)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const [persisted, setPersisted] = useState(initial);
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
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 6,
            }}
          >
            <Body strong>{label}</Body>
            {label.startsWith("Incluir ") && <OptionalBadge />}
          </View>
          <Body muted>{effects[key]}</Body>
        </View>
        <Switch
          accessibilityLabel={label}
          value={!!config[key]}
          trackColor={{ true: t.primary, false: "#aba5b5" }}
          ios_backgroundColor="#aba5b5"
          thumbColor="#ffffff"
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
        if (numericFields[key][0] !== section || !active(key)) continue;
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
      setPersisted(result);
      setSection(null);
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
            <Card>
              {toggle("markupFixo", "Usar o mesmo markup em todos os cálculos")}
              {config.markupFixo && field("markupPercentual")}
            </Card>
            {!config.markupFixo && (
              <Card>
                <Body strong>Atalhos de markup</Body>
                <Body muted>
                  Estes atalhos aparecem quando o markup é variável. Com 50%,
                  uma peça de R$ 10 custa R$ 15 para o cliente antes das taxas.
                </Body>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(
                    ["markupOpcao1", "markupOpcao2", "markupOpcao3"] as const
                  ).map((key) => (
                    <View key={key} style={{ flex: 1 }}>
                      {field(key)}
                    </View>
                  ))}
                </View>
              </Card>
            )}
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
            <Card>{toggle("maoObraAtivada", "Incluir mão de obra")}</Card>
            {config.maoObraAtivada && (
              <Card>
                {field("valorMaoObraHora")}
                {toggle("maoObraTempoFixo", "Usar um tempo fixo")}
                {config.maoObraTempoFixo && field("tempoMaoObraFixoMinutos")}
                <Body muted>
                  Conte o tempo de preparo, acabamento e embalagem da peça.
                </Body>
              </Card>
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
  const shortcuts = [
    config.markupOpcao1,
    config.markupOpcao2,
    config.markupOpcao3,
  ]
    .map((n) => (n ?? 0).toLocaleString("pt-BR") + "%")
    .join(" · ");
  const summaries: Record<Section, string> = {
    preco: config.markupFixo
      ? "Markup fixo de " + config.markupPercentual + "%"
      : "Markup variável · atalhos " + shortcuts,
    mao: config.maoObraAtivada
      ? currency(config.valorMaoObraHora) +
        " por hora · " +
        (config.maoObraTempoFixo
          ? config.tempoMaoObraFixoMinutos + " min por peça"
          : "tempo por cálculo")
      : "Desligada",
    energia: currency(config.tarifaEnergiaKwh) + " por kWh",
    embalagem: config.embalagemFixa
      ? currency(config.custoEmbalagemFixa) + " por unidade"
      : "Escolher a cada cálculo",
    formulario: config.formularioAvancado
      ? "Ligado · taxas detalhadas"
      : "Desligado · venda simples",
    depreciacao: config.depreciacaoAtivada ? "Ligada" : "Desligada",
    purga:
      (config.purgaGramasPorImpressao ?? 0).toLocaleString("pt-BR") +
      " g por impressão",
    falhas: config.taxaFalhaAtivada
      ? config.percentualFalha + "% de margem"
      : "Desligada",
  };
  const minutes = config.maoObraTempoFixo
    ? Number(values.tempoMaoObraFixoMinutos)
    : 15;
  const rate = Number(values.valorMaoObraHora.replace(",", "."));
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        key={section ?? "list"}
        lightHeader
        section={section ? "Configurações" : "Mais"}
        title={groups.find(([k]) => k === section)?.[1] ?? "Configurações"}
        onBack={() => {
          if (busy) return;
          if (!section) return back();
          changed();
          setConfig(persisted);
          setValues(strings(persisted));
          setSection(null);
        }}
      >
        {section ? (
          <>
            {section === "preco" || section === "mao" ? (
              content(section)
            ) : (
              <Card>{content(section)}</Card>
            )}
            {section === "mao" &&
              config.maoObraAtivada &&
              Number.isFinite(rate * minutes) && (
                <Card style={{ backgroundColor: t.accentTint }}>
                  <Body muted>Exemplo</Body>
                  <Body strong>
                    {minutes} min a {currency(rate)} por hora ={" "}
                    {currency((rate * minutes) / 60)} por peça
                  </Body>
                </Card>
              )}
          </>
        ) : (
          <>
            <Body muted>Estes valores entram em todos os cálculos novos.</Body>
            {saved && <Body>Configuração salva.</Body>}
            {sections.map(([name, keys]) => (
              <View key={name} style={{ gap: 6 }}>
                <Body muted>{name}</Body>
                <Card style={{ gap: 0, paddingVertical: 2 }}>
                  {keys.map((key, index) => {
                    const [, label, icon] = groups.find(([k]) => key === k)!;
                    return (
                      <Pressable
                        key={key}
                        accessibilityRole="button"
                        onPress={() => {
                          changed();
                          setSection(key);
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 12,
                          paddingVertical: 10,
                          borderColor: t.border,
                          borderTopWidth: index ? 1 : 0,
                        }}
                      >
                        <View
                          style={{
                            padding: 9,
                            borderRadius: 10,
                            backgroundColor: t.accentTint,
                          }}
                        >
                          <Icon name={icon} color={t.primaryText} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Body strong>{label}</Body>
                          <Body muted>{summaries[key]}</Body>
                        </View>
                        <Icon name="chevron-right" size={14} color={t.muted} />
                      </Pressable>
                    );
                  })}
                </Card>
              </View>
            ))}
          </>
        )}
      </ModuleScreen>
      {section && (
        <View
          style={{
            padding: 12,
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderColor: t.border,
          }}
        >
          {!!error && <Notice message={error} />}
          <Button
            label="Salvar"
            busy={busy}
            disabled={busy}
            onPress={() => void save()}
          />
        </View>
      )}
    </View>
  );
}
