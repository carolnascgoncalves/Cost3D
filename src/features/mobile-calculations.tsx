import { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { router } from "expo-router";
import type { components } from "@/api/schema";
import { ApiError, request } from "@/api/session";
import type { CatalogRow, CatalogCategory } from "@/components/catalog-card";
import { ModuleScreen } from "@/components/module-screen";
import {
  Body,
  Button,
  Card,
  Field,
  Notice,
  Pagination,
  ValueRow,
} from "@/components/ui";
import { useApiQuery } from "@/hooks/use-api-query";
import { reais } from "./format";

type Schema = components["schemas"];
type Result = Schema["ValorCalculo"];
type Selection = {
  id: string;
  nome?: string;
  gramas?: string;
  minutos?: number;
  cor?: string;
};
const menu = () => router.setParams({ modo: "menu", peca: "" });
const money = (n?: number) => reais(n == null ? undefined : String(n));

export function pieceCalculation(row: CatalogRow) {
  return {
    pathname: "/calculate" as const,
    params: {
      modo: "salvar",
      peca: row.id ?? "",
      nome: row.nome ?? "",
      gramas: row.gramas ?? "",
      minutos: String(row.minutos ?? ""),
    },
  };
}

function Picker({
  category,
  label,
  value,
  onChange,
}: {
  category: CatalogCategory;
  label: string;
  value?: Selection;
  onChange: (item?: Selection) => void;
}) {
  const [open, setOpen] = useState(false),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(0);
  const q = useApiQuery<{ itens: CatalogRow[]; total: number }>(
    open
      ? "/catalogo/" +
          category +
          "?pagina=" +
          page +
          "&busca=" +
          encodeURIComponent(search)
      : null,
  );
  function choose(item?: Selection) {
    onChange(item);
    setOpen(false);
  }
  return (
    <View style={{ gap: 6 }}>
      <Body muted>{label}</Body>
      <Button
        variant="secondary"
        label={
          value
            ? [value.nome, value.cor].filter(Boolean).join(" · ") || label
            : "Selecionar " + label.toLowerCase()
        }
        onPress={() => setOpen(!open)}
      />
      {open && (
        <Card>
          <Field
            label="Buscar pelo nome"
            value={search}
            onChangeText={(v) => {
              setSearch(v);
              setPage(0);
            }}
          />
          {q.loading ? (
            <ActivityIndicator />
          ) : q.error ? (
            <Notice message={q.error} onRetry={q.retry} />
          ) : (
            <>
              {q.data?.itens.map(
                (item) =>
                  item.id && (
                    <Button
                      key={item.id}
                      variant="ghost"
                      label={[item.nome, item.cor].filter(Boolean).join(" · ")}
                      onPress={() => choose({ ...item, id: item.id! })}
                    />
                  ),
              )}
              {!q.data?.itens.length && (
                <Body muted>Nenhum item encontrado.</Body>
              )}
              {(q.data?.total ?? 0) > 12 && (
                <Pagination
                  page={page}
                  size={12}
                  total={q.data!.total}
                  onPage={setPage}
                />
              )}
            </>
          )}
          {category === "embalagens" && (
            <Button
              variant="ghost"
              label="Limpar seleção"
              onPress={() => choose()}
            />
          )}
        </Card>
      )}
    </View>
  );
}

export function SavedCalculation({ id }: { id: string }) {
  const q = useApiQuery<Schema["CalculoSalvo"]>(
    "/calculos/" + encodeURIComponent(id),
  );
  const h = q.data;
  return (
    <ModuleScreen
      title="Detalhes do cálculo"
      section="Meus cálculos"
      onBack={() => router.setParams({ modo: "historico" })}
    >
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        h && (
          <>
            <Card>
              <Body strong>{h.valores?.nome}</Body>
              <Body muted>
                {h.data?.split("-").reverse().join("/")} · {h.situacao}
              </Body>
              <ValueRow
                label="Custo por unidade"
                value={money(h.valores?.custoUnitario)}
              />
              <ValueRow
                label="Preço sugerido por unidade"
                value={money(h.valores?.precoUnitario)}
              />
            </Card>
            <Card>
              <Body strong>Dados da impressão</Body>
              <ValueRow label="Impressora" value={h.impressora ?? "—"} />
              <ValueRow label="Filamento" value={h.filamento ?? "—"} />
              <ValueRow label="Embalagem" value={h.embalagem ?? "—"} />
              <ValueRow
                label="Unidades"
                value={String(h.valores?.unidades ?? 1)}
              />
              <ValueRow
                label="Tempo por unidade"
                value={(h.minutos ?? 0) + " min"}
              />
            </Card>
          </>
        )
      )}
    </ModuleScreen>
  );
}
export function CalculationHistory() {
  const [page, setPage] = useState(0),
    [search, setSearch] = useState("");
  const q = useApiQuery<Schema["PaginaResponseHistoricoListaResponse"]>(
    "/calculos?pagina=" + page + "&busca=" + encodeURIComponent(search),
  );
  return (
    <ModuleScreen title="Meus cálculos" section="Calcular" onBack={menu}>
      <Field
        label="Buscar peça"
        value={search}
        onChangeText={(v) => {
          setSearch(v);
          setPage(0);
        }}
      />
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          {q.data?.itens?.map((item) => (
            <Card key={item.id}>
              <Body strong>{item.nomePeca}</Body>
              <Body muted>
                {item.dataCalculo?.slice(0, 10).split("-").reverse().join("/")}{" "}
                · {item.unidades ?? 1} un. ·{" "}
                {item.vendido
                  ? "Vendido"
                  : item.produzido
                    ? "Produzido"
                    : "Só cálculo"}
              </Body>
              <ValueRow
                label="Custo por unidade"
                value={money(item.custoTotal)}
              />
              <ValueRow
                label="Preço sugerido por unidade"
                value={money(item.precoSugerido)}
              />
              <Button
                variant="ghost"
                label="Ver detalhes"
                onPress={() =>
                  router.setParams({ modo: "detalhe", id: item.id })
                }
              />
            </Card>
          ))}
          {!q.data?.itens?.length && (
            <Body muted>
              {search
                ? "Nenhum cálculo encontrado."
                : "Você ainda não tem cálculos salvos."}
            </Body>
          )}
          {(q.data?.total ?? 0) > 12 && (
            <Pagination
              page={page}
              total={q.data!.total!}
              size={12}
              onPage={setPage}
            />
          )}
        </>
      )}
    </ModuleScreen>
  );
}

type Material = { key: number; item?: Selection; grams: string };
export function CalculationForm({
  quick,
  initial,
}: {
  quick: boolean;
  initial?: Selection;
}) {
  const [piece, setPiece] = useState(initial),
    [printer, setPrinter] = useState<Selection>(),
    [pack, setPack] = useState<Selection>();
  const defaults = useApiQuery<Schema["PadroesCalculo"]>("/calculos/padroes");
  const nextKey = useRef(1),
    lock = useRef(false);
  const [materials, setMaterials] = useState<Material[]>([
    { key: 0, grams: initial?.gramas ?? "" },
  ]);
  const [minutes, setMinutes] = useState(String(initial?.minutos ?? "")),
    [units, setUnits] = useState("1"),
    [labor, setLabor] = useState("0"),
    [markup, setMarkup] = useState("");
  const [result, setResult] = useState<Result>(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  function update(key: number, patch: Partial<Material>) {
    setMaterials((prev) =>
      prev.map((m) => (m.key === key ? { ...m, ...patch } : m)),
    );
  }
  const numeric = (s: string) =>
    /^\d+([,.]\d+)?$/.test(s.trim()) ? Number(s.trim().replace(",", ".")) : NaN;
  async function submit(save: boolean) {
    if (lock.current) return;
    setError("");
    if (
      (!quick && !piece?.id) ||
      !printer ||
      materials.some((m) => !m.item || !(numeric(m.grams) > 0)) ||
      !(numeric(minutes) > 0 && Number.isInteger(numeric(minutes))) ||
      !(
        Number.isInteger(numeric(units)) &&
        numeric(units) >= 1 &&
        numeric(units) <= 10000
      ) ||
      !Number.isInteger(numeric(labor || "0")) ||
      (markup && !Number.isFinite(numeric(markup)))
    ) {
      setError(
        "Confira os itens selecionados, os gramas e os tempos. Informe entre 1 e 10.000 unidades.",
      );
      return;
    }
    if (!defaults.data?.embalagemFixa && !pack) {
      setError("Selecione uma embalagem.");
      return;
    }
    if (new Set(materials.map((m) => m.item?.id)).size !== materials.length) {
      setError("Some o consumo de cada filamento em uma única linha.");
      return;
    }
    const input: Schema["EntradaCalculo"] = {
      pecaId: quick ? undefined : piece?.id,
      impressoraId: printer.id,
      filamentos: materials.map((m) => ({
        filamentoId: m.item!.id,
        quantidadeFilamentoGramas: numeric(m.grams),
      })),
      embalagemId: pack?.id,
      unidades: numeric(units),
      minutos: numeric(minutes),
      trabalho: numeric(labor || "0"),
      markup: markup ? numeric(markup) : undefined,
    };
    lock.current = true;
    setBusy(true);
    try {
      setResult(
        await request<Result>(save ? "/calculos" : "/calculos/previa", {
          method: "POST",
          body: JSON.stringify(
            save
              ? {
                  entrada: input,
                  custoEsperado: result?.custoUnitario,
                  precoEsperado: result?.precoUnitario,
                }
              : input,
          ),
        }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) setResult(undefined);
      setError(e instanceof Error ? e.message : "Não foi possível calcular.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const back = () => {
    if (busy) return;
    if (result && !result.id) {
      setResult(undefined);
      setError("");
    } else menu();
  };
  return (
    <ModuleScreen
      section="Calcular"
      title={quick ? "Consultar sem salvar" : "Calcular e salvar"}
      onBack={back}
    >
      {defaults.loading ? (
        <ActivityIndicator />
      ) : defaults.error ? (
        <Notice message={defaults.error} onRetry={defaults.retry} />
      ) : result ? (
        <Card>
          <Body strong>
            {result.id ? "Cálculo salvo" : "Resultado da consulta"}
          </Body>
          <Body>{result.nome}</Body>
          <ValueRow
            label="Custo por unidade"
            value={money(result.custoUnitario)}
          />
          <ValueRow
            label="Preço sugerido por unidade"
            value={money(result.precoUnitario)}
          />
          <Body muted>{result.unidades} un. · Venda direta</Body>
          {result.id ? (
            <Button
              label="Ver meus cálculos"
              onPress={() => router.setParams({ modo: "historico" })}
            />
          ) : (
            <>
              {!quick && (
                <Button
                  label="Confirmar e salvar"
                  busy={busy}
                  disabled={busy}
                  onPress={() => void submit(true)}
                />
              )}
              <Button
                label="Ajustar cálculo"
                variant="secondary"
                disabled={busy}
                onPress={back}
              />
            </>
          )}
        </Card>
      ) : (
        <View pointerEvents={busy ? "none" : "auto"} style={{ gap: 12 }}>
          <Card>
            <Body strong>Dados de impressão</Body>
            {!quick && (
              <Picker
                label="Peça"
                category="pecas"
                value={piece}
                onChange={(p) => {
                  setPiece(p);
                  setMinutes(String(p?.minutos ?? ""));
                  setMaterials([
                    { key: nextKey.current++, grams: p?.gramas ?? "" },
                  ]);
                }}
              />
            )}
            <Picker
              label="Impressora"
              category="impressoras"
              value={printer}
              onChange={setPrinter}
            />
            <Field
              label="Quantidade de unidades"
              keyboardType="number-pad"
              value={units}
              onChangeText={setUnits}
            />
            <Field
              label={
                quick ? "Tempo total do lote (min)" : "Tempo por unidade (min)"
              }
              keyboardType="number-pad"
              value={minutes}
              onChangeText={setMinutes}
            />
            <Body muted>Uma unidade por impressão.</Body>
          </Card>
          <Card>
            <Body strong>Materiais</Body>
            {materials.map((m) => (
              <View key={m.key} style={{ gap: 8 }}>
                <Picker
                  label="Filamento"
                  category="filamentos"
                  value={m.item}
                  onChange={(item) => update(m.key, { item })}
                />
                <Field
                  label={
                    quick
                      ? "Consumo total do lote (g)"
                      : "Consumo por unidade (g)"
                  }
                  keyboardType="decimal-pad"
                  value={m.grams}
                  onChangeText={(grams) => update(m.key, { grams })}
                />
                {materials.length > 1 && (
                  <Button
                    variant="ghost"
                    label="Remover filamento"
                    onPress={() =>
                      setMaterials(materials.filter((x) => x.key !== m.key))
                    }
                  />
                )}
              </View>
            ))}
            {materials.length < 100 && (
              <Button
                variant="ghost"
                label="Adicionar filamento"
                onPress={() =>
                  setMaterials([
                    ...materials,
                    { key: nextKey.current++, grams: "" },
                  ])
                }
              />
            )}
            {defaults.data?.embalagemFixa ? (
              <Body muted>Embalagem fixa da loja</Body>
            ) : (
              <Picker
                label="Embalagem"
                category="embalagens"
                value={pack}
                onChange={setPack}
              />
            )}
          </Card>
          <Card>
            <Body strong>Preço de venda direta</Body>
            <Field
              label="Trabalho manual por unidade (min)"
              value={labor}
              keyboardType="number-pad"
              onChangeText={setLabor}
            />
            {defaults.data?.markupFixo ? (
              <Body muted>Markup fixo da loja · {defaults.data.markup}%</Body>
            ) : (
              <Field
                label="Markup (%)"
                placeholder={String(defaults.data?.markup ?? 0)}
                value={markup}
                keyboardType="decimal-pad"
                onChangeText={setMarkup}
              />
            )}
          </Card>
          <Button
            label={quick ? "Consultar preço" : "Calcular prévia"}
            busy={busy}
            disabled={busy}
            onPress={() => void submit(false)}
          />
        </View>
      )}
      {!!error && <Notice message={error} />}
    </ModuleScreen>
  );
}
