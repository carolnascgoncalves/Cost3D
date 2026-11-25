import { SearchEmpty } from "@/components/ui";
import { ColorWheel } from "@/components/color-wheel";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ModuleScreen } from "@/components/module-screen";
import {
  Body,
  Button,
  Card,
  Chip,
  Field,
  Notice,
  layout,
} from "@/components/ui";
import { request } from "@/api/session";
import { useApiQuery } from "@/hooks/use-api-query";
import type { CatalogCategory } from "@/components/catalog-card";
import type { components } from "@/api/schema";
import { operationKey } from "./operation-key";
import { pick3mf } from "./pick-3mf";
import { PieceImport, importedFields } from "./catalog-file";
import { useTheme } from "@/theme/provider";
import { reais } from "./format";
type Data = Record<string, string | number | boolean | null>;
type FieldSpec = [string, string, "text" | "decimal" | "integer", boolean?];
const fields: Record<CatalogCategory | "compra", FieldSpec[]> = {
  pecas: [
    ["nome", "Nome da peça", "text", true],
    ["categoria", "Categoria", "text", true],
    ["quantidadeFilamentoGramas", "Filamento por unidade (g)", "decimal", true],
    ["tempoImpressaoMinutos", "Tempo por unidade (min)", "integer", true],
  ],
  filamentos: [
    ["nome", "Nome do filamento", "text", true],
    ["cor", "Nome da cor", "text", true],
    ["codigoCor", "Cor hexadecimal", "text", true],
    ["marca", "Marca", "text"],
    ["pesoRoloGramas", "Peso do rolo (g)", "decimal", true],
    ["estoqueGramas", "Estoque atual (g)", "decimal"],
    ["precoRolo", "Preço do rolo (R$)", "decimal", true],
  ],
  impressoras: [
    ["nome", "Nome da impressora", "text", true],
    ["modelo", "Modelo", "text", true],
    ["potenciaWatts", "Potência média (W)", "decimal", true],
    ["tempoAquecimentoMinutos", "Aquecimento (min)", "integer"],
    ["valorCompra", "Valor de compra (R$)", "decimal"],
    ["vidaUtilHoras", "Horas previstas até troca ou revenda", "decimal"],
    ["horasMensaisUso", "Uso mensal (h)", "decimal"],
    ["depreciacaoPorHora", "Depreciação por hora (R$)", "decimal"],
  ],
  embalagens: [
    ["nome", "Nome da embalagem", "text", true],
    ["custoUnitario", "Custo por unidade (R$)", "decimal", true],
  ],
  compra: [
    ["unidadesCompra", "Quantidade de rolos", "integer", true],
    ["pesoRoloGramas", "Peso por rolo (g)", "decimal", true],
    ["precoRolo", "Preço pago por rolo (R$)", "decimal", true],
    ["gramasCompradas", "Peso total comprado (g, opcional)", "decimal"],
  ],
};
const newTitles = {
  pecas: "Nova peça",
  filamentos: "Novo filamento",
  impressoras: "Nova impressora",
  embalagens: "Nova embalagem",
};
const sections = {
  pecas: "Peças",
  filamentos: "Filamentos",
  impressoras: "Impressoras",
  embalagens: "Embalagens",
};
const placeholders: Record<string, string> = {
  marca: "Ex.: Bambu Lab",
  categoria: "Escolha ou digite uma categoria",
  quantidadeFilamentoGramas: "Ex.: 120,00",
  tempoImpressaoMinutos: "Ex.: 180",
  cor: "Ex.: Verde-menta",
  pesoRoloGramas: "Ex.: 1000",
  estoqueGramas: "Se vazio, usa o peso do rolo",
  precoRolo: "Ex.: 89,90",
  modelo: "Ex.: Bambu Lab A1",
  vidaUtilHoras: "Ex.: 5000",
  depreciacaoPorHora: "Informe um valor",
  custoUnitario: "Ex.: 2,50",
};
const examples = {
  pecas: "Ex.: Dragão articulado",
  filamentos: "Ex.: PLA Premium",
  impressoras: "Ex.: Impressora principal",
  embalagens: "Ex.: Caixa pequena",
};
const suggestions = [
  "Decoração",
  "Utilidades",
  "Organização",
  "Brinquedos",
  "Miniaturas",
  "Acessórios",
  "Casa",
  "Outros",
];
const names = {
  pecas: "peça",
  filamentos: "filamento",
  impressoras: "impressora",
  embalagens: "embalagem",
};
type Props = {
  category: CatalogCategory;
  id?: string;
  purchase: boolean;
  onBack: () => void;
  onSaved: () => void;
};
export function CatalogEditor(props: Props) {
  const path = "/catalogo/" + props.category + (props.id ? "/" + props.id : "");
  const q = useApiQuery<Data>(props.id ? path + "/edicao" : null);
  if (!props.id || q.data)
    return <Form {...props} path={path} original={q.data ?? {}} />;
  return (
    <ModuleScreen
      lightHeader
      section={sections[props.category]}
      title={
        props.purchase ? "Registrar compra" : "Editar " + names[props.category]
      }
      onBack={props.onBack}
    >
      {q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <ActivityIndicator />
      )}
    </ModuleScreen>
  );
}
function Form({
  id,
  category,
  purchase,
  path,
  original,
  onSaved,
  onBack,
}: Props & { path: string; original: Data }) {
  const t = useTheme();
  const [advanced, setAdvanced] = useState(false),
    [colors, setColors] = useState(false),
    [focused, setFocused] = useState(""),
    [reference, setReference] = useState("");
  const models = useApiQuery<{ nome: string; potenciaMediaPLA: number }[]>(
    category === "impressoras" ? "/catalogo/impressoras/modelos" : null,
  );
  const specs = fields[purchase ? "compra" : category];
  const [values, setValues] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        specs.map(([key]) => [
          key,
          String(
            key === "unidadesCompra"
              ? 1
              : (original[key] ?? (key === "codigoCor" ? "#000000" : "")),
          ),
        ]),
      ),
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [file, setFile] =
      useState<components["schemas"]["PecaModeloImportacaoRequest"]>();
  const lock = useRef(false),
    attempt = useRef({ signature: "", key: "" });
  async function choose() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const body = await pick3mf();
      if (!body) return;
      const f = await request<
        components["schemas"]["PecaModeloImportacaoRequest"]
      >("/catalogo/pecas/ler-arquivo", { method: "POST", body });
      setFile(f);
      const imported = importedFields(f);
      const previous = file ? importedFields(file) : {};
      setValues((v) => {
        const next = { ...v };
        for (const [key, old] of Object.entries(previous)) {
          if (next[key] === old) next[key] = "";
        }
        return { ...next, ...imported, nome: next.nome || imported.nome || "" };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao ler o arquivo.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function save() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const data: Data = purchase ? {} : { ...original };
      for (const [key, label, kind, required] of specs) {
        const raw = values[key].trim();
        if (!raw && required)
          throw new Error("Preencha o campo " + label + ".");
        if (kind === "text") {
          data[key] = raw;
          continue;
        }
        if (
          raw &&
          !(kind === "integer" ? /^\d+$/ : /^\d+([.,]\d+)?$/).test(raw)
        )
          throw new Error("Confira o campo " + label + ".");
        data[key] = raw ? raw.replace(",", ".") : null;
      }
      if (
        !purchase &&
        category === "filamentos" &&
        String(data.estoqueGramas ?? "") ===
          String(original.estoqueGramas ?? "")
      )
        data.estoqueGramas = null;
      if (!purchase && category === "impressoras") {
        if (Number(original.horasMensaisUso) !== Number(data.horasMensaisUso))
          data.horasMensaisManual = data.horasMensaisUso != null;
        if (
          Number(original.depreciacaoPorHora) !==
          Number(data.depreciacaoPorHora)
        ) {
          data.depreciacaoManual = data.depreciacaoPorHora != null;
          data.depreciacaoOrigem = data.depreciacaoManual ? "Manual" : null;
        }
      }
      if (
        !id &&
        category === "impressoras" &&
        data.tempoAquecimentoMinutos == null
      )
        data.tempoAquecimentoMinutos = 0;
      if (file) data.dadosArquivo3mf = JSON.stringify(file);
      const signature = JSON.stringify(data);
      if ((purchase || !id) && attempt.current.signature !== signature)
        attempt.current = { signature, key: operationKey() };
      await request(
        purchase
          ? path + "/compras"
          : id
            ? path
            : path + "?chave=" + attempt.current.key,
        {
          method: purchase || !id ? "POST" : "PUT",
          body: purchase
            ? JSON.stringify({ chave: attempt.current.key, compra: data })
            : signature,
        },
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  function update(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }
  const model = values.modelo?.trim() ?? "";
  const selectedModel = models.data?.find(
    (m) => m.nome.toLowerCase() === model.toLowerCase(),
  );
  async function selectModel(name: string, watts: number) {
    setFocused("");
    setReference("");
    setValues((v) => ({ ...v, modelo: name, potenciaWatts: String(watts) }));
    try {
      const uso = await request<{
        horasAteSubstituicao: number;
        horasMensais: number;
      }>("/catalogo/impressoras/uso?modelo=" + encodeURIComponent(name));
      setValues((v) =>
        v.modelo !== name
          ? v
          : {
              ...v,
              vidaUtilHoras:
                v.vidaUtilHoras || String(uso.horasAteSubstituicao),
              horasMensaisUso: v.horasMensaisUso || String(uso.horasMensais),
            },
      );
    } catch {
      /* Manual values remain editable. */
    }
  }
  async function lookup() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await request<{
        disponivel: boolean;
        mensagem?: string;
        depreciacaoPorHora?: number;
        horasAteSubstituicao?: number;
        horasMensais?: number;
      }>(
        "/catalogo/impressoras/referencia?modelo=" +
          encodeURIComponent(model) +
          (id ? "&id=" + id : ""),
      );
      setReference(
        r.mensagem ||
          (r.disponivel ? "Referência aplicada." : "Referência indisponível."),
      );
      setValues((v) => ({
        ...v,
        vidaUtilHoras: v.vidaUtilHoras || String(r.horasAteSubstituicao ?? ""),
        horasMensaisUso: v.horasMensaisUso || String(r.horasMensais ?? ""),
        depreciacaoPorHora:
          r.disponivel && r.depreciacaoPorHora != null
            ? String(r.depreciacaoPorHora)
            : v.depreciacaoPorHora,
      }));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Erro ao consultar referência.",
      );
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  const imported = file ? importedFields(file) : {};
  function field([key, label, kind, required]: FieldSpec) {
    if (key === "codigoCor")
      return (
        <View key={key} style={{ gap: 8 }}>
          <Body strong>Escolha a cor</Body>
          <View style={layout.row}>
            <View
              style={{
                width: 46,
                height: 42,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: /^#[0-9a-f]{6}$/i.test(values[key])
                  ? values[key]
                  : t.surface,
              }}
            />
            <Button
              label="Escolher cor"
              variant="secondary"
              onPress={() => setColors(!colors)}
            />
          </View>
          {colors && (
            <Card>
              <ColorWheel
                value={values[key]}
                onChange={(v) => update(key, v)}
              />
            </Card>
          )}
        </View>
      );
    return (
      <View key={key} style={{ gap: 4 }}>
        <Field
          optional={!required}
          label={
            key === "estoqueGramas"
              ? "Disponível agora (g)"
              : key === "marca"
                ? "Marca (opcional)"
                : label
          }
          placeholder={key === "nome" ? examples[category] : placeholders[key]}
          value={values[key]}
          keyboardType={
            kind === "integer"
              ? "number-pad"
              : kind === "decimal"
                ? "decimal-pad"
                : "default"
          }
          onFocus={() => setFocused(key)}
          onChangeText={(v) => {
            if (key === "modelo") {
              setReference("");
              if (selectedModel)
                setValues((prev) => ({ ...prev, potenciaWatts: "" }));
            }
            update(key, v);
          }}
        />
        {key === "categoria" && focused === key && (
          <View style={layout.row}>
            {!!values[key] &&
              !suggestions.some((c) =>
                c.toLowerCase().includes(values[key].toLowerCase()),
              ) && (
                <SearchEmpty message="Nenhuma categoria encontrada. Você pode usar a categoria digitada." />
              )}
            {suggestions
              .filter((c) =>
                c.toLowerCase().includes(values[key].toLowerCase()),
              )
              .map((c) => (
                <Chip
                  key={c}
                  label={c}
                  selected={values[key] === c}
                  onPress={() => {
                    update(key, c);
                    setFocused("");
                  }}
                />
              ))}
          </View>
        )}
        {key === "modelo" && focused === key && (
          <View style={layout.row}>
            {!!model &&
              models.data &&
              !models.data.some((m) =>
                m.nome.toLowerCase().includes(model.toLowerCase()),
              ) && (
                <SearchEmpty message="Nenhum modelo encontrado. Você pode usar o modelo digitado." />
              )}
            {models.data
              ?.filter((m) =>
                m.nome.toLowerCase().includes(model.toLowerCase()),
              )
              .slice(0, 6)
              .map((m) => (
                <Chip
                  key={m.nome}
                  label={m.nome}
                  selected={m.nome === model}
                  onPress={() => void selectModel(m.nome, m.potenciaMediaPLA)}
                />
              ))}
          </View>
        )}
        {imported[key] && values[key] === imported[key] && (
          <Body muted>✓ Preenchido pelo arquivo</Body>
        )}
      </View>
    );
  }
  const printerExtras = [
    "vidaUtilHoras",
    "horasMensaisUso",
    "depreciacaoPorHora",
    "valorCompra",
    "tempoAquecimentoMinutos",
  ];
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        lightHeader
        section={sections[category]}
        title={
          purchase
            ? "Registrar compra"
            : id
              ? "Editar " + names[category]
              : newTitles[category]
        }
        onBack={() => {
          if (!busy) onBack();
        }}
      >
        {purchase && (
          <Body strong>
            {original.nome} · {original.cor}
          </Body>
        )}
        {category === "pecas" && (
          <PieceImport
            key={file?.nomeArquivo}
            file={file}
            busy={busy}
            choose={() => void choose()}
            reapply={() => {
              if (file) {
                const { nome, ...stats } = importedFields(file);
                setValues((v) => ({ ...v, ...stats }));
              }
            }}
          />
        )}
        {specs
          .filter(
            ([key]) =>
              category !== "impressoras" ||
              (!printerExtras.includes(key) &&
                (key !== "potenciaWatts" ||
                  !!id ||
                  !selectedModel ||
                  !values.potenciaWatts)),
          )
          .map(field)}
        {category === "impressoras" && (
          <>
            {selectedModel && values.potenciaWatts ? (
              <View
                style={{
                  alignSelf: "flex-start",
                  paddingHorizontal: 12,
                  paddingVertical: 9,
                  borderRadius: 8,
                  backgroundColor: t.accentTint,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: t.primaryText,
                  }}
                >
                  Potência média em PLA · {values.potenciaWatts} W
                </Text>
              </View>
            ) : (
              <Body muted>
                Escolha um modelo sugerido ou informe a potência do seu modelo.
              </Body>
            )}
            {field(specs.find((f) => f[0] === "tempoAquecimentoMinutos")!)}
            <Card>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: advanced }}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  minHeight: 36,
                }}
                onPress={() => setAdvanced(!advanced)}
              >
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: t.text }}
                >
                  Depreciação da impressora
                </Text>
                <Text style={{ color: t.muted }}>{advanced ? "▴" : "▾"}</Text>
              </Pressable>
              {advanced && (
                <>
                  {field(specs.find((f) => f[0] === "vidaUtilHoras")!)}
                  <Body muted>
                    Estimativa inicial de 3.000 h para modelos compactos ou
                    5.000 h para os demais. Ajuste conforme seu uso.
                  </Body>
                  {field(specs.find((f) => f[0] === "horasMensaisUso")!)}
                  <Body muted>
                    Depreciação estimada no mês ·{" "}
                    {reais(
                      String(
                        Number(values.depreciacaoPorHora.replace(",", ".")) *
                          Number(values.horasMensaisUso.replace(",", ".")),
                      ),
                    )}
                  </Body>
                  {field(specs.find((f) => f[0] === "depreciacaoPorHora")!)}
                  <Body muted>
                    Ex.: diferença de R$ 1.000 em 2.000 h = R$ 0,50/h.
                  </Body>
                  {field(specs.find((f) => f[0] === "valorCompra")!)}
                  <Button
                    variant="secondary"
                    label="Buscar referência de preços"
                    disabled={busy || model.length < 2}
                    onPress={() => void lookup()}
                  />
                  {!!reference && <Body>{reference}</Body>}
                </>
              )}
            </Card>
            <Body muted>
              A depreciação entra no cálculo quando ativada em Configurações.
            </Body>
          </>
        )}
      </ModuleScreen>
      <View
        style={{
          padding: 12,
          backgroundColor: t.surface,
          gap: 6,
          borderTopWidth: 1,
          borderColor: t.border,
        }}
      >
        {!!error && <Notice message={error} />}
        <View style={{ flexDirection: "row", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              variant="secondary"
              label="Cancelar"
              disabled={busy}
              onPress={onBack}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label={purchase ? "Registrar compra" : "Salvar"}
              disabled={busy}
              busy={busy}
              onPress={() => void save()}
            />
          </View>
        </View>
      </View>
    </View>
  );
}
