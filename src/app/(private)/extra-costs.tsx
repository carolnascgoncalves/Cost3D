import { router } from "expo-router";
import { useState, useRef } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ModuleScreen } from "@/components/module-screen";
import {
  Body,
  Button,
  Card,
  Chip,
  Empty,
  Field,
  Notice,
  Pagination,
  ValueRow,
  layout,
} from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import type { components } from "@/api/schema";
import { operationKey } from "@/features/operation-key";
import { reais, toIsoDate } from "@/features/format";

type S = components["schemas"];
type Cost = S["CustoResumo"];
type Mode = S["CustoLojaEntrada"]["tipo"];
const modes: Record<Mode, string> = {
  VALOR_UNIDADE: "Valor por unidade",
  PERCENTUAL: "Percentual",
  RATEIO_MENSAL: "Rateio mensal",
};
const money = (n?: number) => reais(n == null ? undefined : String(n));
const base = "/custos-loja";
function summary(c: Cost) {
  if (c.tipo === "RATEIO_MENSAL")
    return "Rateio mensal · " + c.unidadesPrevistas + " un. previstas";
  if (c.tipo === "PERCENTUAL")
    return c.valor?.toLocaleString("pt-BR") + "% por unidade";
  return money(c.valor) + " por unidade";
}
function CostCard({ cost: c, open }: { cost: Cost; open?: () => void }) {
  const t = useTheme();
  const percent = c.meta
    ? Math.max(0, Math.min(100, (100 * (c.recuperado ?? 0)) / c.meta))
    : 0;
  return (
    <Card>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          style={{ flex: 1, fontSize: 17, fontWeight: "700", color: t.text }}
        >
          {c.descricao}
        </Text>
        <Text style={{ color: c.ativo ? t.success : t.muted }}>
          {c.ativo ? "Ativo" : "Pausado"}
        </Text>
      </View>
      <Body muted>
        {summary(c)} · Desde {c.inicio?.split("-").reverse().join("/")}
      </Body>
      <ValueRow label="Meta" value={money(c.meta)} />
      <View
        style={{
          height: 6,
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: t.border,
        }}
      >
        <View
          style={{
            height: 6,
            width: `${percent}%`,
            backgroundColor: t.success,
          }}
        />
      </View>
      <ValueRow label="Recuperado nas vendas" value={money(c.recuperado)} />
      <ValueRow label="Falta cobrir" value={money(c.restante)} />
      {!!c.excedente && (
        <ValueRow label="Acima da meta" value={money(c.excedente)} />
      )}
      {open && (
        <Button variant="secondary" label="Ver detalhes" onPress={open} />
      )}
    </Card>
  );
}
export default function ExtraCosts() {
  const [screen, setScreen] = useState<"list" | "new" | "detail">("list"),
    [id, setId] = useState(""),
    [page, setPage] = useState(0);
  const list = useApiQuery<Cost[]>(screen === "list" ? base : null, true);
  const detail = useApiQuery<S["CustoDetalhe"]>(
    screen === "detail" ? base + "/" + id + "?pagina=" + page : null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    lock = useRef(false);
  const c = detail.data?.custo;
  function back() {
    if (busy) return;
    if (screen === "list") {
      router.canGoBack() ? router.back() : router.replace("/more");
      return;
    }
    setError("");
    setScreen("list");
  }
  function open(id: string) {
    setId(id);
    setPage(0);
    setError("");
    setScreen("detail");
  }
  async function toggle() {
    if (lock.current || !c) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await request(base + "/" + id + "/estado?ativo=" + !c.ativo, {
        method: "PUT",
      });
      detail.retry();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível alterar o custo.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (screen === "new") return <NewCost onBack={back} onCreated={open} />;
  const q = screen === "list" ? list : detail;
  return (
    <ModuleScreen
      key={screen}
      section={screen === "list" ? "Mais" : "Custos extras"}
      title={screen === "list" ? "Custos extras" : "Detalhes do custo"}
      onBack={back}
    >
      {!!error && <Notice message={error} />}
      {screen === "list" && (
        <Button
          label="+ Novo custo"
          onPress={() => {
            setError("");
            setScreen("new");
          }}
        />
      )}
      {q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : q.loading ? (
        <ActivityIndicator />
      ) : screen === "list" ? (
        list.data?.length ? (
          list.data.map((c) => (
            <CostCard key={c.id} cost={c} open={() => open(c.id!)} />
          ))
        ) : (
          <Empty
            title="Nenhum custo extra cadastrado"
            description="Adicione uma despesa para acompanhar quanto suas vendas já cobriram."
          />
        )
      ) : (
        c && (
          <>
            <CostCard cost={c} />
            <Button
              variant="secondary"
              label={
                c.ativo
                  ? "Pausar nos novos cálculos"
                  : "Ativar nos novos cálculos"
              }
              disabled={busy}
              onPress={() => void toggle()}
            />
            <Body strong>Peças com este custo</Body>
            {detail.data?.pecas?.length ? (
              detail.data.pecas.map((r) => (
                <Card key={r.calculoId}>
                  <Body strong>{r.nome}</Body>
                  <ValueRow
                    label="Por unidade"
                    value={money(r.valorUnitario)}
                  />
                  <ValueRow
                    label="Vendidas / unidades do lote"
                    value={r.vendidas + " / " + r.unidades}
                  />
                  <ValueRow label="Recuperado" value={money(r.recuperado)} />
                  <Button
                    variant="ghost"
                    label="Ver cálculo"
                    onPress={() =>
                      router.push({
                        pathname: "/calculate",
                        params: { modo: "detalhe", id: r.calculoId },
                      })
                    }
                  />
                </Card>
              ))
            ) : (
              <Body muted>
                Este custo ainda não foi incluído em nenhum cálculo.
              </Body>
            )}
            {(detail.data?.total ?? 0) > 20 && (
              <Pagination
                total={detail.data!.total!}
                page={page}
                onPage={setPage}
              />
            )}
          </>
        )
      )}
    </ModuleScreen>
  );
}
function NewCost({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (id: string) => void;
}) {
  const [description, setDescription] = useState(""),
    [date, setDate] = useState(() =>
      new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
      }).format(new Date()),
    ),
    [target, setTarget] = useState(""),
    [value, setValue] = useState(""),
    [units, setUnits] = useState(""),
    [mode, setMode] = useState<Mode>("VALOR_UNIDADE");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false),
    attempt = useRef({ body: "", key: "" });
  function amount(s: string) {
    return /^\d+(?:[.,]\d{1,2})?$/.test(s.trim())
      ? Number(s.trim().replace(",", "."))
      : NaN;
  }
  async function save() {
    if (lock.current) return;
    setError("");
    const inicio = toIsoDate(date),
      meta = amount(target),
      valor = amount(value);
    if (
      description.trim().length < 2 ||
      !inicio ||
      !(meta > 0 && meta <= 9999999999.99)
    ) {
      setError("Confira a descrição, a data e o valor da meta.");
      return;
    }
    if (
      mode === "RATEIO_MENSAL"
        ? !(/^\d+$/.test(units) && +units >= 1 && +units <= 10000000)
        : !(valor > 0 && valor <= (mode === "PERCENTUAL" ? 100 : 9999999999.99))
    ) {
      setError(
        "Confira " +
          (mode === "RATEIO_MENSAL"
            ? "as unidades previstas."
            : mode === "PERCENTUAL"
              ? "o percentual, entre 0,01% e 100%."
              : "o valor por unidade."),
      );
      return;
    }
    const body = JSON.stringify({
      descricao: description.trim(),
      inicio,
      meta,
      tipo: mode,
      ...(mode === "RATEIO_MENSAL" ? { unidadesPrevistas: +units } : { valor }),
    });
    if (body !== attempt.current.body)
      attempt.current = { body, key: operationKey() };
    lock.current = true;
    setBusy(true);
    try {
      const id = await request<string>(base + "?chave=" + attempt.current.key, {
        method: "POST",
        body,
      });
      onCreated(id);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Não foi possível salvar o custo.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <ModuleScreen
      section="Custos extras"
      title="Novo custo"
      onBack={() => {
        if (!busy) onBack();
      }}
    >
      <Card>
        <Field
          label="Descrição"
          maxLength={150}
          value={description}
          onChangeText={setDescription}
        />
        <Field
          label="Início"
          placeholder="dd/mm/aaaa"
          maxLength={10}
          value={date}
          onChangeText={setDate}
        />
        <Field
          label="Meta a recuperar (R$)"
          keyboardType="decimal-pad"
          value={target}
          onChangeText={setTarget}
        />
        <Body strong>Como distribuir o custo</Body>
        <View style={layout.row}>
          {(Object.keys(modes) as Mode[]).map((m) => (
            <Chip
              key={m}
              label={modes[m]}
              selected={m === mode}
              onPress={() => setMode(m)}
            />
          ))}
        </View>
        {mode === "RATEIO_MENSAL" ? (
          <Field
            label="Unidades previstas no mês"
            keyboardType="number-pad"
            value={units}
            onChangeText={setUnits}
          />
        ) : (
          <Field
            label={
              mode === "PERCENTUAL"
                ? "Percentual sobre o custo (%)"
                : "Valor por unidade (R$)"
            }
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
        )}
        {!!error && <Notice message={error} />}
        <Button
          label="Salvar custo"
          busy={busy}
          disabled={busy}
          onPress={() => void save()}
        />
      </Card>
    </ModuleScreen>
  );
}
