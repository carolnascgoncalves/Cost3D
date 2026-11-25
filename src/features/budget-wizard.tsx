import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Clipboard,
  Keyboard,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import {
  Body,
  Button,
  Card,
  Field,
  Chip,
  Notice,
  Pagination,
  ValueRow,
} from "@/components/ui";
import { ModuleScreen } from "@/components/module-screen";
import { PlanningSheet } from "./planning-sheet";
import { addDays, dateLabel, localNow, weekday } from "./planning-dates";
import { openWebsite } from "./website";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";
import { request } from "@/api/session";
import type { CustomerList } from "./contracts";
import { operationKey } from "./operation-key";
import {
  Avatar,
  Metric,
  PieceMark,
  Stepper,
  Steps,
  money,
  row,
  stamp,
  type DataForm,
  type Detail,
  type Line,
  type RefPiece,
} from "./budget-ui";
import { phone } from "./format";

function initial(): DataForm {
  return {
    titulo: "Novo orçamento",
    cliente: "",
    contato: "",
    email: "",
    observacoes: "",
    inicioPretendido: localNow().slice(0, 16),
    turnoInicio: "08:00",
    turnoFim: "18:00",
    dias: "1,2,3,4,5",
    intervalo: 10,
    folga: 10,
    descontoInformado: "0",
    frete: 0,
    custoFrete: 0,
  };
}
function Amount({
  label,
  value,
  change,
  optional,
}: {
  label: string;
  value: number;
  change: (n: number) => void;
  optional?: boolean;
}) {
  const [text, set] = useState(String(value ?? 0).replace(".", ","));
  return (
    <Field
      label={label}
      optional={optional}
      keyboardType="decimal-pad"
      value={text}
      onChangeText={(s) => {
        if (/^\d{0,8}([.,]\d{0,2})?$/.test(s)) {
          set(s);
          change(Number(s.replace(",", ".")) || 0);
        }
      }}
    />
  );
}
function Expand({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  const [shown, set] = useState(false);
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
        onPress={() => set(!shown)}
        style={row}
      >
        <View style={{ flex: 1 }}>
          <Body strong>{title}</Body>
          {!!note && <Body muted>{note}</Body>}
        </View>
        <Body>{shown ? "⌄" : "›"}</Body>
      </Pressable>
      {shown && children}
    </Card>
  );
}
function Duration({ minutes }: { minutes: number }) {
  return (
    <Body strong>
      {Math.floor(minutes / 60)} h {minutes % 60} min
    </Body>
  );
}

export function BudgetWizard({ id, close }: { id: string; close: () => void }) {
  const t = useTheme(),
    [saved, setSaved] = useState<Detail>(),
    [preview, setPreview] = useState<Detail>(),
    [stage, setStage] = useState(0),
    [form, setForm] = useState<DataForm>(initial),
    [lines, setLines] = useState<Line[]>([]),
    [error, setError] = useState(""),
    [busy, working] = useState(false),
    lock = useRef(false),
    [confirmation, confirm] = useState(""),
    [customerSheet, customers] = useState(false),
    [search, find] = useState(""),
    [pieceSearch, findPiece] = useState(""),
    [page, setPage] = useState(0),
    [week, setWeek] = useState(() =>
      addDays(localNow().slice(0, 10), -localWeekday()),
    ),
    [copied, copy] = useState(false);
  function localWeekday() {
    const d = new Date(localNow().slice(0, 10) + "T00:00:00Z");
    return d.getUTCDay();
  }
  const initialQuery = useApiQuery<Detail>(
    id === "new" ? null : "/orcamentos/" + id,
  );
  const readonly =
    !!saved && (saved.resumo.status !== "RASCUNHO" || saved.resumo.arquivado);
  const refs = useApiQuery<RefPiece[]>(
    !readonly && stage === 1 ? "/orcamentos/pecas" : null,
  );
  const clients = useApiQuery<CustomerList>(
    customerSheet
      ? "/clientes?arquivados=false&tamanho=20&pagina=" +
          page +
          "&busca=" +
          encodeURIComponent(search)
      : null,
  );
  const attempt = useRef({ body: "", key: "" });
  function apply(d: Detail) {
    setSaved(d);
    setPreview(d);
    setLines(d.itens);
    setForm({
      ...initial(),
      ...d.dados,
      cliente: d.dados.cliente ?? "",
      email: d.dados.email ?? "",
      contato: d.dados.contato ?? "",
      observacoes: d.dados.observacoes ?? "",
      inicioPretendido: (d.dados.inicioPretendido || localNow()).slice(0, 16),
    });
  }
  useEffect(() => {
    if (initialQuery.data) {
      apply(initialQuery.data);
      setStage(
        initialQuery.data.resumo.status === "RASCUNHO" &&
          !initialQuery.data.resumo.arquivado
          ? 1
          : 4,
      );
      setWeek(
        (initialQuery.data.dados.inicioPretendido || localNow()).slice(0, 10),
      );
    }
  }, [initialQuery.data]);
  function field<K extends keyof DataForm>(key: K, value: DataForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function update(i: number, patch: Partial<Line>) {
    setLines((list) => list.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  }
  const body = JSON.stringify({
    revisao: saved?.resumo.revisao,
    dados: form,
    itens: lines.map((l) => ({
      id: l.id,
      referencia: l.referencia,
      quantidade: l.quantidade,
      estoque: l.estoque,
      preco: l.preco,
    })),
    enviar: false,
  });
  const savedId = saved?.resumo.id;
  useEffect(() => {
    if (!savedId || readonly || stage < 2 || stage > 3) return;
    let active = true;
    const timer = setTimeout(() => {
      request<Detail>("/orcamentos/" + savedId + "/previa", {
        method: "PUT",
        body,
      })
        .then((d) => {
          if (active) {
            setPreview(d);
            setError("");
          }
        })
        .catch((e) => {
          if (active) {
            setPreview(undefined);
            setError(e.message);
          }
        });
    }, 430);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [body, savedId, stage, readonly]);
  const subtotal = lines.reduce((n, l) => n + l.preco * l.quantidade, 0);
  const rawDiscount =
      parseFloat((form.descontoInformado || "0").replace(",", ".")) || 0,
    discount = form.descontoInformado?.endsWith("%")
      ? Math.round(subtotal * rawDiscount) / 100
      : rawDiscount;
  const total = subtotal - discount + Number(form.frete || 0);
  async function persist(send = false) {
    if (!saved) {
      const data = JSON.stringify({
        cliente: form.cliente,
        email: form.email,
        contato: form.contato,
        compradorId: form.compradorId,
        itens: lines.map((l) => ({
          referencia: l.referencia,
          selecionado: true,
          quantidade: l.quantidade,
          estoque: l.estoque,
        })),
      });
      if (attempt.current.body !== data)
        attempt.current = { body: data, key: operationKey() };
      const d = await request<Detail>(
        "/orcamentos?chave=" + attempt.current.key,
        { method: "POST", body: data },
      );
      apply(d);
      return d;
    }
    const d = await request<Detail>("/orcamentos/" + savedId, {
      method: "PUT",
      body: JSON.stringify({ ...JSON.parse(body), enviar: send }),
    });
    apply(d);
    return d;
  }
  async function run(fn: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    working(true);
    setError("");
    Keyboard.dismiss();
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      working(false);
      lock.current = false;
    }
  }
  function advance() {
    void run(async () => {
      if (stage > 0) {
        if (!lines.length) throw Error("Selecione ao menos uma peça.");
        await persist();
      }
      setStage(stage + 1);
    });
  }
  function back() {
    if (readonly || stage === 0) {
      close();
      return;
    }
    setError("");
    setStage(stage - 1);
  }
  async function action(name: string, item?: string) {
    const d = await request<Detail>(
      "/orcamentos/" +
        savedId +
        "/" +
        name +
        "?revisao=" +
        saved?.resumo.revisao +
        (item ? "&item=" + item : ""),
      { method: "POST" },
    );
    confirm("");
    apply(d);
    if (name === "revisar") setStage(1);
    if (name === "cancelar") close();
  }
  const summaryText = () =>
    [
      saved?.resumo.titulo,
      form.cliente,
      ...lines.map(
        (l) =>
          l.quantidade + " × " + l.nome + " · " + money(l.preco * l.quantidade),
      ),
      "Total " + money(total),
      "Previsão " + stamp(preview?.previsao),
      form.observacoes,
    ]
      .filter(Boolean)
      .join("\n");
  const outbound = (kind: string) =>
    void run(async () => {
      const d = readonly ? saved! : await persist();
      const msg = summaryText();
      if (kind === "PDF" || kind === "frete")
        return await openWebsite(
          "/orcamentos/" +
            d.resumo.id +
            (kind === "PDF" ? "/proposta" : "/frete"),
        );
      if (kind === "Copiar mensagem") {
        if (Platform.OS === "web") await navigator.clipboard.writeText(msg);
        else Clipboard.setString(msg);
        copy(true);
        return;
      }
      const tel = (form.contato || "").replace(/\D/g, "");
      await Linking.openURL(
        kind === "WhatsApp"
          ? "https://wa.me/" +
              (tel.length === 10 || tel.length === 11 ? "55" + tel : tel) +
              "?text=" +
              encodeURIComponent(msg)
          : "mailto:" +
              encodeURIComponent(form.email || "") +
              "?subject=" +
              encodeURIComponent(d.resumo.titulo) +
              "&body=" +
              encodeURIComponent(msg),
      );
    });
  const day = form.inicioPretendido.slice(0, 10),
    end = preview?.previsao,
    prints = preview?.linhas.flatMap((l) => l.impressoes ?? []) ?? [],
    duration = prints.reduce(
      (n, p) =>
        n +
        Math.round(
          (Date.parse(p.fim + "Z") - Date.parse(p.inicio + "Z")) / 60000,
        ),
      0,
    ),
    buffer = prints.reduce((n, p) => n + p.minutosFolga, 0);
  const view = stage === 0 || stage === 1 ? 0 : stage - 1;
  const candidates = [
    ...lines.map((l, i) => ({ l, i, selected: true })),
    ...(refs.data ?? [])
      .filter((r) => !lines.some((l) => l.referencia === r.id))
      .map((r) => ({
        l: {
          referencia: r.id,
          nome: r.nome,
          material: [r.material, r.impressora].filter(Boolean).join(" · "),
          livre: r.disponivel,
          quantidade: 1,
          estoque: 0,
          preco: r.preco,
        } as Line,
        i: -1,
        selected: false,
      })),
  ].filter(({ l }) =>
    (l.nome + " " + l.material)
      .toLocaleLowerCase()
      .includes(pieceSearch.toLocaleLowerCase()),
  );
  if (id !== "new" && !saved)
    return (
      <ModuleScreen
        lightHeader
        section="Orçamentos"
        title="Orçamento"
        onBack={close}
      >
        {initialQuery.error ? (
          <Notice message={initialQuery.error} onRetry={initialQuery.retry} />
        ) : (
          <ActivityIndicator />
        )}
      </ModuleScreen>
    );
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        key={stage}
        lightHeader
        section="Orçamentos"
        title={
          readonly
            ? "Proposta #" + saved?.resumo.codigo
            : id === "new"
              ? "Novo orçamento"
              : "Editar orçamento"
        }
        onBack={back}
      >
        {!readonly && <Steps step={view} />}
        {!!error && <Notice message={error} />}
        {stage === 0 && (
          <>
            <Card>
              <Body strong>Para quem é o orçamento?</Body>
              <Body muted>Busque um cliente ou preencha abaixo.</Body>
              <Button
                label="Buscar cliente"
                variant="secondary"
                onPress={() => customers(true)}
              />
            </Card>
            <Card>
              <Field
                optional
                label="Nome do cliente"
                value={form.cliente}
                onChangeText={(v) => field("cliente", v)}
                placeholder="Pode preencher depois"
              />
              <Field
                optional
                label="Telefone / WhatsApp"
                value={form.contato}
                onChangeText={(v) => field("contato", v)}
                keyboardType="phone-pad"
                placeholder="Telefone com DDD"
              />
              <Field
                optional
                label="E-mail"
                value={form.email}
                onChangeText={(v) => field("email", v)}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="cliente@exemplo.com"
              />
              <Body muted>
                Ao escolher um cliente, os contatos são preenchidos só para esta
                proposta.
              </Body>
            </Card>
          </>
        )}
        {stage === 1 && (
          <>
            <Pressable onPress={() => setStage(0)}>
              <Card style={row}>
                <Avatar name={form.cliente} />
                <View>
                  <Body strong>{form.cliente || "Cliente a informar"}</Body>
                  {!!form.contato && <Body muted>{phone(form.contato)}</Body>}
                </View>
              </Card>
            </Pressable>
            <Field
              label="Qual peça o cliente quer?"
              value={pieceSearch}
              onChangeText={findPiece}
              placeholder="Nome, material ou impressora"
            />
            {refs.loading ? (
              <ActivityIndicator />
            ) : refs.error ? (
              <Notice message={refs.error} onRetry={refs.retry} />
            ) : !candidates.length ? (
              <Body muted>Nenhuma peça encontrada.</Body>
            ) : null}
            {candidates.map(({ l, i, selected }) => (
              <Card
                key={l.id || l.referencia}
                style={{ borderColor: selected ? t.primary : t.border }}
              >
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() =>
                    selected
                      ? setLines(lines.filter((_, k) => k !== i))
                      : setLines([...lines, l])
                  }
                  style={row}
                >
                  <Text
                    style={{
                      backgroundColor: selected ? t.header : t.accentTint,
                      color: t.onPrimary,
                      width: 23,
                      height: 23,
                      lineHeight: 23,
                      textAlign: "center",
                      borderRadius: 5,
                    }}
                  >
                    {selected ? "✓" : ""}
                  </Text>
                  <PieceMark />
                  <View style={{ flex: 1 }}>
                    <Body strong>{l.nome}</Body>
                    <Body muted>{l.material}</Body>
                  </View>
                </Pressable>
                <Text
                  style={{
                    color: l.livre ? t.success : t.muted,
                    backgroundColor: l.livre ? "#e7f2e9" : t.accentTint,
                    borderRadius: 8,
                    padding: 5,
                    fontSize: 12,
                  }}
                >
                  {l.livre} un. {l.livre === 1 ? "livre" : "livres"}
                </Text>
                {selected && (
                  <>
                    <Stepper
                      label="Quantidade que o cliente quer"
                      min={1}
                      max={500}
                      value={l.quantidade}
                      change={(n) =>
                        update(i, {
                          quantidade: n,
                          estoque: Math.min(l.estoque, n),
                        })
                      }
                    />
                    <Stepper
                      label={
                        "Usar do estoque (máx. " +
                        Math.min(l.livre, l.quantidade) +
                        ")"
                      }
                      value={l.estoque}
                      max={Math.min(l.livre, l.quantidade)}
                      change={(n) => update(i, { estoque: n })}
                    />
                    <View
                      style={{
                        height: 5,
                        backgroundColor: "#dba437",
                        borderRadius: 4,
                      }}
                    >
                      <View
                        style={{
                          width: ((l.estoque / l.quantidade) * 100 +
                            "%") as `${number}%`,
                          height: 5,
                          backgroundColor: t.success,
                        }}
                      />
                    </View>
                    <Body muted>
                      {l.estoque} do estoque · {l.quantidade - l.estoque} a
                      produzir
                    </Body>
                  </>
                )}
              </Card>
            ))}
          </>
        )}
        {stage === 2 && (
          <>
            <Card>
              <Body strong>Quando fica pronto?</Body>
              <Body muted>
                Escolha o dia e o horário de início. O ponto marca produção já
                agendada.
              </Body>
              <View style={row}>
                <Pressable
                  accessibilityLabel="Semana anterior"
                  onPress={() => setWeek(addDays(week, -7))}
                >
                  <Body>‹</Body>
                </Pressable>
                {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(
                  (d) => (
                    <Pressable
                      key={d}
                      onPress={() =>
                        field(
                          "inicioPretendido",
                          d + "T" + form.inicioPretendido.slice(11),
                        )
                      }
                      style={{
                        flex: 1,
                        alignItems: "center",
                        paddingVertical: 6,
                        borderRadius: 12,
                        backgroundColor: d === day ? t.header : t.surface,
                      }}
                    >
                      <Text
                        style={{
                          color: d === day ? t.onPrimary : t.muted,
                          fontSize: 10,
                        }}
                      >
                        {weekday(d)[0].toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          color: d === day ? t.onPrimary : t.text,
                          fontWeight: "700",
                        }}
                      >
                        {d.slice(8)}
                      </Text>
                      <Text
                        style={{
                          height: 11,
                          fontSize: 10,
                          color: d === day ? t.onPrimary : t.primary,
                        }}
                      >
                        {preview?.ocupacoes.some(
                          (o) =>
                            o.inicio.slice(0, 10) <= d &&
                            o.fim.slice(0, 10) >= d,
                        )
                          ? "●"
                          : " "}
                      </Text>
                    </Pressable>
                  ),
                )}
                <Pressable
                  accessibilityLabel="Próxima semana"
                  onPress={() => setWeek(addDays(week, 7))}
                >
                  <Body>›</Body>
                </Pressable>
              </View>
              <Field
                label="Horário de início"
                value={form.inicioPretendido.slice(11)}
                onChangeText={(v) => field("inicioPretendido", day + "T" + v)}
                placeholder="08:00"
              />
            </Card>
            <Card>
              <Body muted>Previsão concluída</Body>
              <Text style={{ fontSize: 23, fontWeight: "700", color: t.text }}>
                {end
                  ? weekday(end.slice(0, 10)) + ", " + stamp(end)
                  : "A confirmar"}
              </Text>
              {end && (
                <Body muted>
                  Pronto em{" "}
                  {new Date(end).toLocaleDateString("pt-BR", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                  })}
                </Body>
              )}
              <View
                style={{
                  backgroundColor: t.selectionTint,
                  height: 12,
                  borderRadius: 6,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    backgroundColor: t.chartColor,
                    width: (duration
                      ? (100 * (duration - buffer)) / duration + "%"
                      : "0%") as `${number}%`,
                    height: 12,
                  }}
                />
              </View>
              <Body muted>Dia 6h–18h · Impressão · Folga</Body>
            </Card>
            <View style={row}>
              <Card style={{ flex: 1 }}>
                <Duration minutes={duration} />
                <Body muted>Duração total</Body>
              </Card>
              <Card style={{ flex: 1 }}>
                <Duration minutes={duration - buffer} />
                <Body muted>Impressão</Body>
              </Card>
              <Metric label="Folga" value={form.folga + "%"} />
            </View>
            <Expand
              title="Expediente e início"
              note={
                form.turnoInicio.slice(0, 5) + " – " + form.turnoFim.slice(0, 5)
              }
            >
              <Field
                label="Início do expediente"
                value={form.turnoInicio}
                onChangeText={(v) => field("turnoInicio", v)}
              />
              <Field
                label="Fim do expediente"
                value={form.turnoFim}
                onChangeText={(v) => field("turnoFim", v)}
              />
              <View style={{ ...row, flexWrap: "wrap" }}>
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map(
                  (s, i) => {
                    const key = String(i + 1),
                      days = form.dias.split(",").filter(Boolean);
                    return (
                      <Chip
                        label={s}
                        key={s}
                        selected={days.includes(key)}
                        onPress={() =>
                          field(
                            "dias",
                            (days.includes(key)
                              ? days.filter((x) => x !== key)
                              : [...days, key]
                            )
                              .sort()
                              .join(","),
                          )
                        }
                      />
                    );
                  },
                )}
              </View>
            </Expand>
            <Expand
              title="Ajustes de segurança"
              note={
                form.intervalo +
                " min entre impressões · folga de " +
                form.folga +
                "%"
              }
            >
              <Field
                label="Intervalo (min)"
                keyboardType="number-pad"
                value={String(form.intervalo)}
                onChangeText={(v) => field("intervalo", Number(v) || 0)}
              />
              <Field
                label="Folga (%)"
                keyboardType="number-pad"
                value={String(form.folga)}
                onChangeText={(v) => field("folga", Number(v) || 0)}
              />
            </Expand>
            {!!preview?.aviso && <Notice message={preview.aviso} />}
          </>
        )}
        {stage === 3 && (
          <>
            <Card>
              <Body strong>Desconto e frete</Body>
              <View style={row}>
                <View style={{ flex: 1 }}>
                  <Field
                    optional
                    label="Desconto (R$ ou %)"
                    value={form.descontoInformado}
                    onChangeText={(v) => field("descontoInformado", v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Amount
                    optional
                    label="Frete cobrado (R$)"
                    value={form.frete}
                    change={(v) => field("frete", v)}
                  />
                </View>
              </View>
              <Body muted>15 = R$ 15,00 · 15% = porcentagem</Body>
            </Card>
            {lines.map((l, i) => (
              <Card key={l.id || i}>
                <View style={row}>
                  <PieceMark />
                  <View style={{ flex: 1 }}>
                    <Body strong>{l.nome}</Body>
                  </View>
                </View>
                <View style={row}>
                  <View style={{ flex: 1 }}>
                    <Amount
                      label="Preço por unidade (R$)"
                      value={l.preco}
                      change={(n) => update(i, { preco: n })}
                    />
                  </View>
                  <View>
                    <Body muted>Subtotal</Body>
                    <Body strong>{money(l.preco * l.quantidade)}</Body>
                  </View>
                </View>
              </Card>
            ))}
            <View style={row}>
              <Metric
                label="Lucro estimado"
                value={preview ? money(preview.resultado.lucro) : "—"}
              />
              <Metric
                label="Margem"
                value={
                  preview
                    ? Number(preview.resultado.margem).toLocaleString("pt-BR", {
                        maximumFractionDigits: 1,
                      }) + "%"
                    : "—"
                }
              />
            </View>
            <View style={{ ...row, gap: 0 }}>
              {preview && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: -5,
                    zIndex: 1,
                    height: 16,
                    width: 3,
                    borderRadius: 2,
                    backgroundColor: t.text,
                    left: ((preview.resultado.estado === "prejuizo"
                      ? 16
                      : preview.resultado.estado === "boa"
                        ? 84
                        : 50) + "%") as `${number}%`,
                  }}
                />
              )}
              {["#df8e94", "#edc261", "#88bd9d"].map((c, i) => (
                <View
                  key={c}
                  style={{ flex: 1, borderTopWidth: 6, borderColor: c }}
                >
                  <Body muted>
                    {["Prejuízo", "Apertada", "Saudável ≥ 15%"][i]}
                  </Body>
                </View>
              ))}
            </View>
            {preview && <Body strong>{preview.resultado.titulo}</Body>}
            <Body muted>
              Vermelho: lucro ≤ 0 · amarelo: margem abaixo de 15% · verde: a
              partir de 15%.
            </Body>
            <Expand
              title="Meu custo de envio e cotação"
              note="Quanto você paga pelo transporte"
            >
              <Amount
                optional
                label="Meu custo de envio (R$)"
                value={form.custoFrete}
                change={(n) => field("custoFrete", n)}
              />
              <Button
                label="Cotar frete"
                variant="secondary"
                onPress={() => outbound("frete")}
              />
            </Expand>
          </>
        )}
        {stage === 4 && (
          <>
            <Body strong>Confira a proposta</Body>
            <View style={{ ...row, alignItems: "stretch" }}>
              <Card style={{ flex: 1 }}>
                <Body muted>CLIENTE</Body>
                <Body strong>{form.cliente || "A informar"}</Body>
                {!!form.contato && <Body muted>{phone(form.contato)}</Body>}
              </Card>
              <Card style={{ flex: 1 }}>
                <Body muted>PRAZO PREVISTO</Body>
                <Body strong>{stamp(end)}</Body>
                <Body muted>Confira antes de combinar a entrega.</Body>
              </Card>
            </View>
            {lines.map((l, i) => (
              <Card key={l.id || i} style={row}>
                <PieceMark />
                <View style={{ flex: 1 }}>
                  <Body strong>{l.nome}</Body>
                  <Body muted>
                    {l.quantidade} un. × {money(l.preco)}
                  </Body>
                </View>
                <Body strong>{money(l.quantidade * l.preco)}</Body>
              </Card>
            ))}
            <Card>
              <ValueRow label="Peças" value={money(subtotal)} />
              <ValueRow label="Desconto" value={money(discount)} />
              <ValueRow label="Frete cobrado" value={money(form.frete)} />
              <ValueRow label="Total ao cliente" value={money(total)} />
            </Card>
            <Card>
              <Body strong>Para onde vai o dinheiro</Body>
              <ValueRow
                label="Produção e envio"
                value={money(preview?.custo ?? 0)}
              />
              <ValueRow label="Taxas" value={money(preview?.taxas ?? 0)} />
              <ValueRow
                label="Lucro estimado"
                value={money(preview?.resultado.lucro ?? 0)}
              />
            </Card>
            <Card>
              <Field
                optional
                editable={!readonly}
                label="Observações para o cliente"
                multiline
                placeholder="Ex.: retirada na loja após a confirmação de que as peças estão prontas."
                value={form.observacoes}
                onChangeText={(v) => field("observacoes", v)}
              />
            </Card>
            <Card>
              <Body strong>Compartilhar com o cliente</Body>
              <View style={row}>
                {["WhatsApp", "PDF"].map((k, i) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Button
                      label={k}
                      variant={i ? "secondary" : "primary"}
                      disabled={busy}
                      onPress={() => outbound(k)}
                    />
                  </View>
                ))}
              </View>
              <Body muted>
                Abrir o WhatsApp não marca a proposta como enviada.
              </Body>
            </Card>
            <Expand title="Outros canais" note="E-mail e copiar mensagem">
              <Button
                label="E-mail"
                variant="secondary"
                onPress={() => outbound("E-mail")}
              />
              <Button
                label={copied ? "Mensagem copiada" : "Copiar mensagem"}
                variant="secondary"
                onPress={() => outbound("Copiar mensagem")}
              />
            </Expand>
            <Expand title="Materiais e reposição" note="Uso interno">
              {preview?.materiais?.materiais.map((m, i) => (
                <ValueRow
                  key={i}
                  label={m.nome + " · " + m.cor}
                  value={
                    m.necessario +
                    " g" +
                    (m.falta > 0 ? " · faltam " + m.falta + " g" : "")
                  }
                />
              ))}
              {preview?.materiais ? (
                <ValueRow
                  label="Reposição"
                  value={money(preview.materiais.reposicao)}
                />
              ) : (
                <Body muted>
                  {preview?.aviso || "Sem materiais informados."}
                </Body>
              )}
            </Expand>
            {!readonly && (
              <Button
                label="Cancelar rascunho"
                variant="danger"
                onPress={() => confirm("cancelar")}
              />
            )}
            {readonly && saved && !saved.resumo.arquivado && (
              <Card>
                <Body strong>{saved.resumo.situacao}</Body>
                {saved.resumo.status === "ENVIADO" && (
                  <>
                    <Button
                      label="Aprovar pedido"
                      onPress={() => confirm("aprovar")}
                    />
                    <Button
                      label="Revisar proposta"
                      variant="secondary"
                      onPress={() => confirm("revisar")}
                    />
                  </>
                )}
                {["APROVADO", "PRONTO"].includes(saved.resumo.status) &&
                  lines
                    .filter((l) => !l.pronto)
                    .map((l) => (
                      <Button
                        key={l.id}
                        label={"Registrar produção · " + l.nome}
                        onPress={() => confirm("produzir/" + l.id)}
                      />
                    ))}
                {saved.resumo.situacao === "Pronto para entregar" && (
                  <Button
                    label="Registrar entrega"
                    onPress={() => confirm("entregar")}
                  />
                )}
                {!saved.resumo.pago &&
                  ["APROVADO", "PRONTO", "ENTREGUE"].includes(
                    saved.resumo.status,
                  ) && (
                    <Button
                      label="Registrar pagamento"
                      onPress={() => confirm("pagar")}
                    />
                  )}
              </Card>
            )}
          </>
        )}
      </ModuleScreen>
      {!readonly && (
        <View
          style={{
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderColor: t.border,
          }}
        >
          <View
            style={{
              ...row,
              justifyContent: "space-between",
              paddingHorizontal: 16,
              paddingVertical: 7,
              backgroundColor: t.selectionTint,
            }}
          >
            <Body>Total do orçamento</Body>
            <Body strong>{money(total)}</Body>
          </View>
          <View style={{ ...row, paddingHorizontal: 16, paddingVertical: 9 }}>
            <View style={{ flex: 1 }}>
              <Button
                variant="secondary"
                disabled={busy}
                label={
                  stage === 4
                    ? "Salvar rascunho"
                    : stage < 2
                      ? "Cancelar"
                      : "Voltar"
                }
                onPress={() =>
                  stage === 4
                    ? void run(async () => {
                        await persist();
                        close();
                      })
                    : stage < 2
                      ? close()
                      : back()
                }
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={stage === 4 ? "Marcar como enviada" : "Continuar"}
                busy={busy}
                disabled={stage === 1 && !lines.length}
                onPress={() =>
                  stage === 4
                    ? void run(async () => {
                        await persist(true);
                        close();
                      })
                    : advance()
                }
              />
            </View>
          </View>
        </View>
      )}
      {customerSheet && (
        <PlanningSheet title="Buscar cliente" close={() => customers(false)}>
          <Field
            label="Nome, telefone ou e-mail"
            value={search}
            onChangeText={(v) => {
              find(v);
              setPage(0);
            }}
          />
          {clients.loading ? (
            <ActivityIndicator />
          ) : clients.error ? (
            <Notice message={clients.error} />
          ) : (
            clients.data?.clientes?.itens?.map(
              ({ cliente: c }) =>
                c && (
                  <Pressable
                    key={c.id}
                    style={row}
                    onPress={() => {
                      setForm({
                        ...form,
                        compradorId: c.id,
                        cliente: c.nome || "",
                        email: c.email || "",
                        contato: c.telefone || "",
                      });
                      customers(false);
                      setStage(1);
                    }}
                  >
                    <Avatar name={c.nome} />
                    <View style={{ paddingVertical: 8 }}>
                      <Body strong>{c.nome}</Body>
                      <Body muted>{phone(c.telefone)}</Body>
                    </View>
                  </Pressable>
                ),
            )
          )}
          <Pagination
            page={page}
            total={clients.data?.clientes?.total ?? 0}
            onPage={setPage}
          />
        </PlanningSheet>
      )}
      {!!confirmation && (
        <PlanningSheet title="Confirmar alteração" close={() => confirm("")}>
          <Body>
            {
              (
                {
                  cancelar: "Cancelar este rascunho?",
                  aprovar: "Aprovar o pedido e reservar as peças?",
                  revisar: "Voltar esta proposta para rascunho?",
                  entregar: "Registrar a entrega do pedido?",
                  pagar: "Registrar o pagamento do pedido?",
                  produzir: "Confirmar a produção deste item?",
                } as Record<string, string>
              )[confirmation.split("/")[0]]
            }
          </Body>
          {!!error && <Notice message={error} />}
          <Button
            label="Confirmar"
            busy={busy}
            onPress={() =>
              void run(() =>
                action(confirmation.split("/")[0], confirmation.split("/")[1]),
              )
            }
          />
          <Button
            label="Voltar"
            variant="secondary"
            disabled={busy}
            onPress={() => confirm("")}
          />
        </PlanningSheet>
      )}
    </View>
  );
}
