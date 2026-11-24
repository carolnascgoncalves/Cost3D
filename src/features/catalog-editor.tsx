import { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { ModuleScreen } from "@/components/module-screen";
import { Body, Button, Card, Field, Notice } from "@/components/ui";
import { request } from "@/api/session";
import { useApiQuery } from "@/hooks/use-api-query";
import type { CatalogCategory } from "@/components/catalog-card";
import type { components } from "@/api/schema";
import { operationKey } from "./operation-key";
import { pick3mf } from "./pick-3mf";
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
    ["precoRolo", "Preço do rolo (R$)", "decimal", true],
    ["estoqueGramas", "Estoque atual (g)", "decimal"],
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
const names = {
  pecas: "peça",
  filamentos: "filamento",
  impressoras: "impressora",
  embalagens: "embalagem",
};
type Props = {
  category: CatalogCategory;
  id: string;
  purchase: boolean;
  onBack: () => void;
  onSaved: () => void;
};
export function CatalogEditor(props: Props) {
  const path = "/catalogo/" + props.category + "/" + props.id;
  const q = useApiQuery<Data>(path + "/edicao");
  return (
    <ModuleScreen
      lightHeader
      section="Catálogo"
      title={
        props.purchase ? "Registrar compra" : "Editar " + names[props.category]
      }
      onBack={props.onBack}
    >
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        q.data && <Form {...props} path={path} original={q.data} />
      )}
    </ModuleScreen>
  );
}
function Form({
  category,
  purchase,
  path,
  original,
  onSaved,
}: Props & { path: string; original: Data }) {
  const specs = fields[purchase ? "compra" : category];
  const [values, setValues] = useState<Record<string, string>>(() =>
      Object.fromEntries(
        specs.map(([key]) => [
          key,
          String(key === "unidadesCompra" ? 1 : (original[key] ?? "")),
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
      if (f.dados?.estatisticasCompletas)
        setValues((v) => ({
          ...v,
          quantidadeFilamentoGramas: String(
            f.dados?.pesoTotalGramas ?? v.quantidadeFilamentoGramas,
          ),
          tempoImpressaoMinutos: f.dados?.tempoTotalSegundos
            ? String(Math.ceil(f.dados.tempoTotalSegundos / 60))
            : v.tempoImpressaoMinutos,
        }));
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
      if (file) data.dadosArquivo3mf = JSON.stringify(file);
      const signature = JSON.stringify(data);
      if (purchase && attempt.current.signature !== signature)
        attempt.current = { signature, key: operationKey() };
      await request(purchase ? path + "/compras" : path, {
        method: purchase ? "POST" : "PUT",
        body: purchase
          ? JSON.stringify({ chave: attempt.current.key, compra: data })
          : signature,
      });
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setBusy(false);
      lock.current = false;
    }
  }
  return (
    <Card>
      {purchase && (
        <Body strong>
          {original.nome} · {original.cor}
        </Body>
      )}
      {category === "pecas" && (
        <>
          <Button
            variant="secondary"
            label="Trocar arquivo 3MF"
            disabled={busy}
            onPress={() => void choose()}
          />
          {file && <Body>{file.nomeArquivo}</Body>}
        </>
      )}
      {specs.map(([key, label, kind]) => (
        <View key={key} style={{ gap: 5 }}>
          <Field
            label={label}
            keyboardType={
              kind === "integer"
                ? "number-pad"
                : kind === "decimal"
                  ? "decimal-pad"
                  : "default"
            }
            value={values[key]}
            onChangeText={(v) => setValues((prev) => ({ ...prev, [key]: v }))}
          />
          {key === "codigoCor" && /^#[0-9a-f]{6}$/i.test(values[key]) && (
            <View
              style={{
                backgroundColor: values[key],
                height: 12,
                borderRadius: 5,
              }}
            />
          )}
        </View>
      ))}
      {!!error && <Notice message={error} />}
      <Button
        label={purchase ? "Registrar compra" : "Salvar alterações"}
        disabled={busy}
        busy={busy}
        onPress={() => void save()}
      />
    </Card>
  );
}
