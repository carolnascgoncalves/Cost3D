import { router } from "expo-router";
import { useContext, useState, useRef } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { ModuleScreen } from "@/components/module-screen";
import { BudgetKeyboard } from "@/components/budget-keyboard";
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
function CostCard({ cost: c, open, menuOpen = false, onMenu, onToggle }: { cost: Cost; open?: () => void; menuOpen?: boolean; onMenu?: () => void; onToggle?: () => void }) {
  const t = useTheme();
  const percent = c.meta
    ? Math.max(0, Math.min(100, (100 * (c.recuperado ?? 0)) / c.meta))
    : 0;
  const content = (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <Text
          style={{ flex: 1, fontSize: 16, fontWeight: "700", color: t.text }}
        >
          {c.descricao}
        </Text>
        <Text style={{ color: c.ativo ? t.success : t.muted, backgroundColor: c.ativo ? t.success + "18" : t.accentTint, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, fontSize: 11, fontWeight: "600" }}>
          {c.ativo ? "Ativo" : "Pausado"}
        </Text>
        {open && <Pressable accessibilityRole="button" accessibilityLabel="Ações do custo" hitSlop={8} onPress={(event) => { event.stopPropagation(); onMenu?.(); }}><Text style={{ color: t.muted, fontSize: 20, paddingHorizontal: 2 }}>⋮</Text></Pressable>}
      </View>
      <Body muted>
        {summary(c)} · Desde {c.inicio?.split("-").reverse().join("/")}
      </Body>
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
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}><Text style={{ color: t.text, fontSize: 12, fontWeight: "600" }}>{money(c.recuperado)} recuperados</Text><Text style={{ color: t.muted, fontSize: 12 }}>{Math.round(percent)}% de {money(c.meta)}</Text></View>
      <ValueRow label="Falta cobrir" value={money(c.restante)} />
      {!!c.excedente && (
        <ValueRow label="Acima da meta" value={money(c.excedente)} />
      )}
      {!c.ativo && onToggle && <Pressable accessibilityRole="button" disabled={menuOpen} onPress={(event) => { event.stopPropagation(); onToggle(); }} style={{ alignSelf: "flex-start", paddingVertical: 3 }}><Text style={{ color: t.primaryText, fontSize: 12 }}>▷ Retomar</Text></Pressable>}
      {menuOpen && <View style={{ flexDirection: "row", gap: 8, borderTopWidth: 1, borderColor: t.border, paddingTop: 8 }}><Button compact stretch label="Detalhes" variant="secondary" onPress={open || (() => {})} /><Button compact stretch label={c.ativo ? "Pausar" : "Retomar"} variant="secondary" disabled={!onToggle} onPress={onToggle || (() => {})} /></View>}
    </Card>
  );
  return open ? <Pressable accessibilityRole="button" onPress={open}>{content}</Pressable> : content;
}
export default function ExtraCosts() {
  const [screen, setScreen] = useState<"list" | "new" | "detail">("list"),
    [id, setId] = useState(""),
    [page, setPage] = useState(0),
    [menuId, setMenuId] = useState("");
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
  async function toggleListCost(cost: Cost) {
    if (lock.current || !cost.id) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await request(base + "/" + encodeURIComponent(cost.id) + "/estado?ativo=" + !cost.ativo, { method: "PUT" });
      setMenuId("");
      list.retry();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível alterar o custo.");
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
      titleAccessory={screen === "list" ? <Button compact label="+ Novo" onPress={() => { setError(""); setScreen("new"); }} /> : undefined}
      onBack={back}
    >
      {!!error && <Notice message={error} />}
      {screen === "list" && <Body muted>Despesas que entram no preço das peças até a meta ser recuperada.</Body>}
      {q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : q.loading ? (
        <ActivityIndicator />
      ) : screen === "list" ? (
        list.data?.length ? (
          list.data.map((c) => (
            <CostCard key={c.id} cost={c} open={() => open(c.id!)} menuOpen={menuId === c.id} onMenu={() => setMenuId(menuId === c.id ? "" : c.id!)} onToggle={() => void toggleListCost(c)} />
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
  const t = useTheme();
  const { hidesFooter } = useContext(BudgetKeyboard);
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
  const metaValue = amount(target), unitValue = amount(value), plannedUnits = Number(units);
  const preview = mode === "VALOR_UNIDADE"
    ? metaValue > 0 && unitValue > 0 ? `A meta é recuperada depois de aproximadamente ${Math.ceil(metaValue / unitValue)} unidades vendidas, com ${money(unitValue)} por unidade.` : "Preencha a meta e o valor para ver quanto falta vender."
    : mode === "PERCENTUAL"
      ? metaValue > 0 && unitValue > 0 ? `${unitValue}% será aplicado ao custo base de cada peça até as vendas recuperarem a meta de ${money(metaValue)}.` : "Preencha a meta e o percentual para ver como o custo será aplicado."
      : metaValue > 0 && Number.isInteger(plannedUnits) && plannedUnits > 0 ? `${money(metaValue)} ÷ ${plannedUnits} unidades = ${money(metaValue / plannedUnits)} por unidade neste período.` : "Preencha a meta e as unidades previstas para ver o rateio mensal.";
  return (
    <View style={{ flex: 1 }}>
    <ModuleScreen
      section="Custos extras"
      title="Novo custo"
      onBack={() => {
        if (!busy) onBack();
      }}
    >
      <View style={{ gap: 12 }}>
        <Field
          label="Descrição"
          placeholder="Ex.: Impressora nova"
          maxLength={150}
          value={description}
          onChangeText={setDescription}
        />
        <View style={{ flexDirection: "row", gap: 9 }}>
          <View style={{ flex: 1 }}><Field label="Início" placeholder="27/11/2026" maxLength={10} value={date} onChangeText={setDate} /></View>
          <View style={{ flex: 1 }}><Field label="Meta a recuperar (R$)" placeholder="1.500,00" keyboardType="decimal-pad" value={target} onChangeText={setTarget} /></View>
        </View>
        <Body strong>Como distribuir o custo</Body>
        <View style={{ flexDirection: "row", padding: 3, borderRadius: 11, backgroundColor: t.accentTint, gap: 3 }}>
          {(Object.keys(modes) as Mode[]).map((m) => <Pressable key={m} accessibilityRole="button" accessibilityState={{ selected: m === mode }} onPress={() => setMode(m)} style={{ flex: 1, minHeight: 38, alignItems: "center", justifyContent: "center", borderRadius: 8, borderWidth: mode === m ? 1 : 0, borderColor: t.border, backgroundColor: mode === m ? t.surface : "transparent", paddingHorizontal: 4 }}><Text style={{ color: t.text, fontSize: 11, fontWeight: mode === m ? "700" : "500", textAlign: "center" }}>{m === "VALOR_UNIDADE" ? "Por unidade" : modes[m]}</Text></Pressable>)}
        </View>
        {mode === "RATEIO_MENSAL" ? (
          <Field
            label="Unidades previstas no mês"
            placeholder="300"
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
            placeholder={mode === "PERCENTUAL" ? "10" : "5,00"}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={setValue}
          />
        )}
        <View style={{ backgroundColor: t.accentTint, padding: 11, borderRadius: 10 }}><Body muted>{preview}</Body></View>
        {!!error && <Notice message={error} />}
      </View>
    </ModuleScreen>
    {!hidesFooter && <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderColor: t.border, backgroundColor: t.surface }}><View style={{ flex: 1 }}><Button stretch variant="secondary" label="Cancelar" disabled={busy} onPress={onBack} /></View><View style={{ flex: 1 }}><Button stretch label="Salvar custo" busy={busy} disabled={busy} onPress={() => void save()} /></View></View>}
    </View>
  );
}
