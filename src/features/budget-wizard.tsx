import { formatHourInput } from "./budget-time";
import { proposalMessage } from "./proposal-document";
import { useStoreName } from "@/theme/provider";
import { SearchEmpty } from "@/components/ui";
import { useContext, useEffect, useRef, useState } from "react";
import { BudgetKeyboard } from "@/components/budget-keyboard";
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
import { Icon, type IconName } from "@/components/icon";
import { CalculationPhoto } from "./mobile-calculations";
import { openProposal } from "./proposal-file";
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
      selectTextOnFocus
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
  icon,
}: {
  title: string;
  icon?: IconName;
  note?: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const [shown, set] = useState(false);
  return (
    <Card>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
        onPress={() => set(!shown)}
        style={row}
      >
        {icon && <Icon name={icon} color={t.primaryText} size={22} />}
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
function HourField({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: (s: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <Field
      label={label}
      keyboardType="number-pad"
      selectTextOnFocus
      placeholder="07:00"
      value={draft ?? value.slice(0, 5)}
      onChangeText={(s) => {
        const result = formatHourInput(s, draft);
        setDraft(result.display);
        change(result.value);
      }}
      onBlur={() => {
        if (value) setDraft(null);
      }}
    />
  );
}
export function BudgetWizard({
  id,
  close,
  startInDetails = false,
}: {
  id: string;
  close: () => void;
  startInDetails?: boolean;
}) {
  const { hidesFooter } = useContext(BudgetKeyboard);
  const t = useTheme(),
    storeName = useStoreName(),
    [confirmPrice, setConfirmPrice] = useState(false),
    [saved, setSaved] = useState<Detail>(),
    [preview, setPreview] = useState<Detail>(),
    [detailOnly, setDetailOnly] = useState(startInDetails),
    [stage, setStage] = useState(0),
    [form, setForm] = useState<DataForm>(initial),
    [lines, setLines] = useState<Line[]>([]),
    [error, setError] = useState(""),
    [busy, working] = useState(false),
    lock = useRef(false),
    [confirmation, confirm] = useState(""),
    [editingPhase, setEditingPhase] = useState(false),
    [customerSheet, customers] = useState(false),
    [search, find] = useState(""),
    [selection, selectPieces] = useState<Line[] | null>(null),
    [priceEdit, editPrice] = useState<{ i: number; value: number } | null>(
      null,
    ),
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
    !!saved &&
    (detailOnly ||
      saved.resumo.status !== "RASCUNHO" ||
      saved.resumo.arquivado);
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
        !detailOnly &&
          initialQuery.data.resumo.status === "RASCUNHO" &&
          !initialQuery.data.resumo.arquivado
          ? initialQuery.data.dados.cliente?.trim() &&
            (initialQuery.data.dados.email?.trim() ||
              initialQuery.data.dados.contato?.trim())
            ? 1
            : 0
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
    dados: {
      ...form,
      descontoInformado:
        form.descontoInformado.trim().replace(/^R\$\s*/i, "") || "0",
    },
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
    if (
      !savedId ||
      readonly ||
      stage < 2 ||
      stage > 3 ||
      !form.turnoInicio ||
      !form.turnoFim ||
      !form.inicioPretendido.slice(11)
    )
      return;
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
      parseFloat(
        (form.descontoInformado || "0")
          .replace(/^\s*R\$\s*/i, "")
          .replace(",", "."),
      ) || 0,
    discount = form.descontoInformado?.trim().endsWith("%")
      ? Math.round(subtotal * rawDiscount) / 100
      : rawDiscount;
  const total = subtotal - discount + Number(form.frete || 0);
  function requireClient() {
    if (
      !form.cliente.trim() ||
      !(form.email.trim() || form.contato.replace(/\D/g, ""))
    ) {
      setStage(0);
      throw Error(
        "Informe o nome e pelo menos um contato: telefone ou e-mail.",
      );
    }
  }
  async function persist(send = false) {
    requireClient();
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
      requireClient();
      if (stage > 0) {
        if (!lines.length) throw Error("Selecione ao menos uma peça.");
        await persist();
      }
      setStage(stage + 1);
    });
  }
  function back() {
    editPrice(null);
    setConfirmPrice(false);
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
    if (d.resumo.status === "RASCUNHO") {
      setDetailOnly(false);
      setStage(0);
    }
    setEditingPhase(false);
    if (name === "cancelar") close();
  }
  const outbound = (kind: string) =>
    void run(async () => {
      const d = readonly ? saved! : await persist();
      const msg = proposalMessage(d, storeName, kind === "WhatsApp");
      if (kind === "PDF") return await openProposal(d, storeName);
      if (kind === "frete")
        return await openWebsite("/orcamentos/" + d.resumo.id + "/frete");
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
              encodeURIComponent(
                "Proposta #" +
                  d.resumo.codigo.replace(/^#/, "") +
                  " · " +
                  storeName,
              ) +
              "&body=" +
              encodeURIComponent(msg),
      );
    });
  const day = form.inicioPretendido.slice(0, 10),
    end = preview?.previsao,
    occupied = preview?.ocupacoes ?? saved?.ocupacoes ?? [],
    occupiedOn = (d: string) =>
      occupied.filter(
        (o) =>
          o.inicio < addDays(d, 1) + "T00:00" &&
          o.fim.slice(0, 19) > d + "T00:00:00",
      ),
    profit = preview?.resultado,
    tone =
      profit?.estado === "prejuizo"
        ? ["#fff0ef", "#c15b54", "#8b2e28"]
        : profit?.estado === "boa"
          ? ["#e9f6eb", "#68a478", "#205b32"]
          : ["#fff7de", "#c39a32", "#795618"],
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
  const phases = [
    ["rascunho", "Rascunho"],
    ["enviado", "Enviada ao cliente"],
    ["produzir", "A produzir"],
    ["pronto", "Pronto para entregar"],
    ["pago", "Pago"],
  ];
  const rank =
    saved?.resumo.status === "ENTREGUE"
      ? 5
      : saved?.resumo.pago
        ? 4
        : saved?.resumo.status === "ENVIADO"
          ? 1
          : lines.every((l) => l.pronto)
            ? 3
            : 2;
  const earlier = phases
    .slice(0, rank)
    .filter(
      ([key]) =>
        (key !== "pago" || saved?.resumo.pago) &&
        (key !== "produzir" || lines.some((l) => l.quantidade > l.estoque)) &&
        (key !== "pronto" || lines.every((l) => l.pronto)),
    );
  const expected = preview?.linhas.find(
    (l) => l.itemId === confirmation.split("/")[1],
  )?.fim;
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
        automaticallyAdjustKeyboardInsets={Platform.OS === "ios"}
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
              <Body muted>
                Informe o nome e pelo menos um contato: telefone ou e-mail.
              </Body>
              <Button
                label="Buscar cliente"
                variant="secondary"
                onPress={() => customers(true)}
              />
            </Card>
            <Card>
              <Field
                label="Nome do cliente"
                value={form.cliente}
                onChangeText={(v) => field("cliente", v)}
                placeholder="Nome do cliente"
              />
              <Field
                label="Telefone / WhatsApp"
                value={form.contato}
                onChangeText={(v) => field("contato", v)}
                keyboardType="phone-pad"
                placeholder="Telefone com DDD"
              />
              <Field
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
            <Button
              label={
                lines.length ? "Alterar peças selecionadas" : "Selecionar peças"
              }
              variant="secondary"
              onPress={() => {
                findPiece("");
                selectPieces([...lines]);
              }}
            />
            {lines.map((l, i) => (
              <Card key={l.id || l.referencia}>
                <View style={row}>
                  <CalculationPhoto
                    id={l.referencia ?? undefined}
                    name={l.nome}
                  />
                  <View style={{ flex: 1 }}>
                    <Body strong>{l.nome}</Body>
                    <Body muted>{l.material}</Body>
                  </View>
                </View>
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
                        {occupiedOn(d).length ? "●" : " "}
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
              <View style={row}>
                <Icon name="calendar3" color={t.primaryText} />
                <Body strong>Agenda de {dateLabel(day)}</Body>
              </View>
              {occupiedOn(day).length ? (
                occupiedOn(day).map((o, i) => (
                  <View
                    key={i}
                    style={{
                      padding: 10,
                      borderLeftWidth: 3,
                      borderColor: t.primary,
                      backgroundColor: t.accentTint,
                    }}
                  >
                    <View style={row}>
                      <Icon name="printer" color={t.primaryText} size={17} />
                      <View style={{ flex: 1 }}>
                        <Body strong>{o.nome}</Body>
                      </View>
                    </View>
                    <Body muted>
                      {stamp(o.inicio)} até {stamp(o.fim)}
                    </Body>
                  </View>
                ))
              ) : (
                <Body muted>
                  Nenhuma produção agendada neste dia para as impressoras das
                  peças.
                </Body>
              )}
              <HourField
                label="Horário de início"
                value={form.inicioPretendido.slice(11)}
                change={(v) => field("inicioPretendido", day + "T" + v)}
              />
              <Body muted>
                A previsão considera o expediente e os trabalhos já agendados.
              </Body>
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
            <View style={{ ...row, alignItems: "stretch" }}>
              {[
                ["Duração total", duration, t.accentTint],
                ["Impressão", duration - buffer, t.selectionTint],
                ["Folga", null, t.accentTint],
              ].map(([label, mins, bg]) => (
                <Card
                  key={label}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: 9,
                    backgroundColor: String(bg),
                    justifyContent: "center",
                  }}
                >
                  <Body strong>
                    {typeof mins === "number"
                      ? Math.floor(mins / 60) + " h " + (mins % 60) + " min"
                      : form.folga + "%"}
                  </Body>
                  <Body muted>{label}</Body>
                </Card>
              ))}
            </View>
            <Expand
              icon="clock-history"
              title="Expediente e início"
              note={
                form.turnoInicio.slice(0, 5) + " – " + form.turnoFim.slice(0, 5)
              }
            >
              <HourField
                label="Início do expediente"
                value={form.turnoInicio}
                change={(v) => field("turnoInicio", v)}
              />
              <HourField
                label="Fim do expediente"
                value={form.turnoFim}
                change={(v) => field("turnoFim", v)}
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
              icon="gear"
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
              <Field
                optional
                label="Desconto (R$ ou %)"
                value={form.descontoInformado}
                selectTextOnFocus
                placeholder="Ex.: R$ 15 ou 15%"
                onChangeText={(v) => field("descontoInformado", v)}
              />
              <Body muted>
                Digite R$ 15 para um valor fixo ou 15% para um desconto
                percentual.
              </Body>
              <Amount
                optional
                label="Frete cobrado (R$)"
                value={form.frete}
                change={(v) => field("frete", v)}
              />
            </Card>
            {lines.map((l, i) => (
              <Card key={l.id || i}>
                <View style={row}>
                  <CalculationPhoto
                    id={l.referencia ?? undefined}
                    name={l.nome}
                  />
                  <View style={{ flex: 1 }}>
                    <Body strong>{l.nome}</Body>
                  </View>
                </View>
                <View style={row}>
                  <View style={{ flex: 1 }}>
                    <Body muted>Preço por unidade</Body>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Editar preço de " + l.nome}
                      onPress={() => editPrice({ i, value: l.preco })}
                      style={{ ...row, minHeight: 44 }}
                    >
                      <Body strong>{money(l.preco)}</Body>
                      <Icon name="pencil" color={t.primaryText} size={17} />
                    </Pressable>
                  </View>
                  <View>
                    <Body muted>Subtotal</Body>
                    <Body strong>{money(l.preco * l.quantidade)}</Body>
                  </View>
                </View>
                {priceEdit?.i === i && (
                  <View style={{ gap: 8 }}>
                    <Amount
                      label="Novo preço por unidade (R$)"
                      value={priceEdit.value}
                      change={(v) => editPrice({ i, value: v })}
                    />
                    <Button
                      label="Revisar alteração"
                      disabled={priceEdit.value <= 0}
                      onPress={() => {
                        Keyboard.dismiss();
                        setConfirmPrice(true);
                      }}
                    />
                    <Button
                      variant="ghost"
                      label="Cancelar edição"
                      onPress={() => editPrice(null)}
                    />
                  </View>
                )}
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
            {profit && (
              <Card
                style={{
                  backgroundColor: tone[0],
                  borderColor: tone[1],
                  borderLeftWidth: 3,
                }}
              >
                <Text style={{ color: tone[2], fontWeight: "700" }}>
                  {profit.titulo}
                </Text>
                <Text style={{ color: tone[2] }}>
                  Lucro estimado: {money(profit.lucro)} · Margem:{" "}
                  {profit.margem.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                  %
                </Text>
                <Text style={{ color: tone[2] }}>
                  Com os custos do cálculo, taxas, desconto e envio. Vermelho:
                  lucro igual ou abaixo de zero. Amarelo: margem abaixo de 15%.
                  Verde: a partir de 15%.
                </Text>
              </Card>
            )}
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
            <Card>
              <View
                style={{
                  ...row,
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Body muted>CLIENTE</Body>
                  <Body strong>{form.cliente || "A informar"}</Body>
                  {!!form.contato && <Body muted>{phone(form.contato)}</Body>}
                </View>
                <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
                  <Body muted>PRAZO PREVISTO</Body>
                  <Body strong>{stamp(end)}</Body>
                </View>
              </View>
            </Card>
            {lines.map((l, i) => (
              <Card key={l.id || i} style={row}>
                <CalculationPhoto
                  id={l.referencia ?? undefined}
                  name={l.nome}
                />
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
              <View
                style={{
                  ...row,
                  justifyContent: "space-between",
                  borderTopWidth: 1,
                  borderColor: t.border,
                  paddingTop: 10,
                }}
              >
                <Body>Total ao cliente</Body>
                <Text
                  style={{ fontSize: 22, fontWeight: "700", color: t.text }}
                >
                  {money(total)}
                </Text>
              </View>
              <View style={{ ...row, justifyContent: "space-between" }}>
                <Body muted>Lucro estimado</Body>
                <Text
                  style={{
                    color: (profit?.lucro ?? 0) < 0 ? "#8b2e28" : "#205b32",
                    fontWeight: "700",
                  }}
                >
                  {money(profit?.lucro ?? 0)}
                </Text>
              </View>
            </Card>
            <Expand title="Para onde vai o dinheiro">
              <ValueRow
                label="Produção e envio"
                value={money(preview?.custo ?? 0)}
              />
              <ValueRow label="Taxas" value={money(preview?.taxas ?? 0)} />
            </Expand>
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
              <View style={row}>
                <Icon name="send" size={21} color={t.primaryText} />
                <Body strong>Compartilhar com o cliente</Body>
              </View>
              <View style={row}>
                {["WhatsApp", "PDF"].map((k, i) => (
                  <View key={k} style={{ flex: 1 }}>
                    <Button
                      icon={i ? "file-text" : "chat"}
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
            <Expand
              icon="send"
              title="Compartilhar e materiais"
              note="Outros canais, materiais e reposição"
            >
              <View style={{ ...row, alignItems: "stretch" }}>
                <View style={{ flex: 1 }}>
                  <Button
                    stretch
                    icon="envelope"
                    label="E-mail"
                    variant="secondary"
                    onPress={() => outbound("E-mail")}
                  />
                </View>
                <View style={{ flex: 1.65 }}>
                  <Button
                    stretch
                    icon="copy"
                    label={copied ? "Copiado" : "Copiar mensagem"}
                    variant="secondary"
                    onPress={() => outbound("Copiar mensagem")}
                  />
                </View>
              </View>
              <Body strong>Materiais e reposição · uso interno</Body>
              {preview?.materiais?.materiais.map((m, i) => (
                <View key={i} style={row}>
                  <View
                    style={{
                      width: 16,
                      height: 16,
                      borderWidth: 1,
                      borderRadius: 8,
                      borderColor: t.border,
                      backgroundColor: m.codigoCor || t.accentTint,
                    }}
                  />
                  <View style={{ flex: 1 }}>
                    <ValueRow
                      label={m.nome + " · " + m.cor}
                      value={
                        m.necessario +
                        " g" +
                        (m.falta > 0 ? " · faltam " + m.falta + " g" : "")
                      }
                    />
                  </View>
                </View>
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
                <View style={{ ...row, justifyContent: "space-between" }}>
                  <Body strong>{saved.resumo.situacao}</Body>
                  {saved.resumo.status === "RASCUNHO" && (
                    <Button
                      label="Editar proposta"
                      icon="pencil"
                      onPress={() => {
                        setDetailOnly(false);
                        setStage(0);
                      }}
                    />
                  )}
                  {saved.resumo.status !== "RASCUNHO" &&
                    saved.resumo.status !== "CANCELADO" && (
                      <Button
                        label="Editar fase"
                        icon="pencil"
                        variant="secondary"
                        onPress={() => setEditingPhase(true)}
                      />
                    )}
                </View>
                {saved.resumo.status === "ENVIADO" && (
                  <>
                    <Button
                      label="Aprovar pedido"
                      onPress={() => confirm("aprovar")}
                    />
                  </>
                )}
                {["APROVADO", "PRONTO", "ENTREGUE"].includes(
                  saved.resumo.status,
                ) && (
                  <>
                    <Card style={{ backgroundColor: t.accentTint }}>
                      <Body strong>Peças para produzir</Body>
                      {lines
                        .filter((l) => !l.pronto)
                        .map((l, index) => (
                          <View
                            key={l.id}
                            style={{
                              gap: 6,
                              borderTopWidth: index ? 1 : 0,
                              borderColor: t.border,
                              paddingTop: index ? 12 : 0,
                              paddingBottom: 4,
                            }}
                          >
                            <Body>
                              {l.nome} · {l.quantidade - l.estoque} un.
                            </Body>
                            <Button
                              label="Registrar produção"
                              icon="printer"
                              disabled={busy}
                              onPress={() => confirm("produzir/" + l.id)}
                            />
                          </View>
                        ))}
                      {lines.every((l) => l.pronto) && (
                        <Body muted>Nenhuma peça pendente.</Body>
                      )}
                    </Card>
                    <Card>
                      <Body strong>Peças produzidas</Body>
                      {lines
                        .filter((l) => l.pronto || l.estoque > 0)
                        .map((l, index) => (
                          <View
                            key={l.id}
                            style={{
                              borderTopWidth: index ? 1 : 0,
                              borderColor: t.border,
                              paddingTop: index ? 10 : 0,
                              paddingBottom: 4,
                            }}
                          >
                            <Body>
                              {l.nome} · {l.pronto ? l.quantidade : l.estoque}{" "}
                              un.
                            </Body>
                          </View>
                        ))}
                      {lines.every((l) => !l.pronto && !l.estoque) && (
                        <Body muted>Nenhuma peça produzida ainda.</Body>
                      )}
                    </Card>
                  </>
                )}
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
                      icon="cash-coin"
                      label="Registrar pagamento"
                      disabled={!lines.length || lines.some((l) => !l.pronto)}
                      onPress={() => confirm("pagar")}
                    />
                  )}
              </Card>
            )}
          </>
        )}
      </ModuleScreen>
      {!readonly && !hidesFooter && (
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
          <View
            style={{
              ...row,
              alignItems: "stretch",
              paddingHorizontal: 16,
              paddingVertical: 9,
            }}
          >
            <View style={{ flex: 1 }}>
              <Button
                stretch
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
                stretch
                label={stage === 4 ? "Já enviei ao cliente" : "Continuar"}
                busy={busy}
                disabled={
                  (stage === 3 && priceEdit !== null) ||
                  (stage === 1 && !lines.length) ||
                  (stage === 2 &&
                    (!form.turnoInicio ||
                      !form.turnoFim ||
                      !form.inicioPretendido.slice(11)))
                }
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
      {selection && (
        <PlanningSheet
          header={
            <Field
              label="Buscar peça"
              value={pieceSearch}
              onChangeText={findPiece}
              placeholder="Nome, material ou impressora"
            />
          }
          title="Selecionar peças"
          close={() => selectPieces(null)}
          footer={
            <Button
              label={"Confirmar seleção (" + selection.length + ")"}
              onPress={() => {
                setLines(selection);
                selectPieces(null);
              }}
            />
          }
        >
          {refs.loading && <ActivityIndicator />}
          {refs.error && <Notice message={refs.error} onRetry={refs.retry} />}
          {!refs.loading && !refs.error && !candidates.length && (
            <SearchEmpty message="Nenhuma peça encontrada." />
          )}
          {candidates.map(({ l }) => {
            const key = l.id || l.referencia;
            const checked = selection.some(
              (x) => (x.id || x.referencia) === key,
            );
            return (
              <Pressable
                key={key}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                disabled={!checked && selection.length >= 20}
                onPress={() =>
                  selectPieces(
                    checked
                      ? selection.filter((x) => (x.id || x.referencia) !== key)
                      : [...selection, l],
                  )
                }
                style={{
                  ...row,
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: checked ? t.selectionTint : t.surface,
                }}
              >
                <CalculationPhoto
                  id={l.referencia ?? undefined}
                  name={l.nome}
                />
                <View style={{ flex: 1 }}>
                  <Body strong>{l.nome}</Body>
                  <Body muted>{l.material}</Body>
                </View>
                <Text style={{ color: t.primaryText, fontSize: 21 }}>
                  {checked ? "☑" : "☐"}
                </Text>
              </Pressable>
            );
          })}
        </PlanningSheet>
      )}
      {priceEdit && confirmPrice && (
        <PlanningSheet
          footer={
            <Button
              label="Confirmar novo preço"
              disabled={priceEdit.value <= 0}
              onPress={() => {
                update(priceEdit.i, { preco: priceEdit.value });
                editPrice(null);
                setConfirmPrice(false);
              }}
            />
          }
          title="Editar preço por unidade"
          close={() => setConfirmPrice(false)}
        >
          <Body strong>{lines[priceEdit.i].nome}</Body>
          <Body muted>Preço atual · {money(lines[priceEdit.i].preco)}</Body>
          <Body strong>Novo preço · {money(priceEdit.value)}</Body>
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={() => setConfirmPrice(false)}
          />
        </PlanningSheet>
      )}
      {customerSheet && (
        <PlanningSheet
          header={
            <Field
              label="Nome, telefone ou e-mail"
              value={search}
              onChangeText={(v) => {
                find(v);
                setPage(0);
              }}
            />
          }
          title="Buscar cliente"
          close={() => customers(false)}
        >
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
                      setStage(
                        c.nome?.trim() &&
                          (c.email?.trim() || c.telefone?.trim())
                          ? 1
                          : 0,
                      );
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
          {!clients.loading &&
            !clients.error &&
            !clients.data?.clientes?.itens?.length && (
              <SearchEmpty message="Nenhum cliente encontrado." />
            )}
          <Pagination
            page={page}
            total={clients.data?.clientes?.total ?? 0}
            onPage={setPage}
          />
        </PlanningSheet>
      )}
      {editingPhase && !confirmation && saved && (
        <PlanningSheet
          title="Voltar para uma fase anterior"
          close={() => setEditingPhase(false)}
        >
          {earlier.map(([key, label]) => (
            <Button
              key={key}
              label={label}
              variant="secondary"
              onPress={() => confirm("voltar-" + key)}
            />
          ))}
        </PlanningSheet>
      )}
      {!!confirmation && (
        <PlanningSheet title="Confirmar alteração" close={() => confirm("")}>
          <Body>
            {confirmation.startsWith("voltar-")
              ? "Voltar para " +
                phases.find(([k]) => "voltar-" + k === confirmation)?.[1] +
                "? " +
                (confirmation === "voltar-pago"
                  ? "A entrega será desmarcada e o pagamento mantido."
                  : (saved?.resumo.pago
                      ? "O registro do pagamento e as vendas vinculadas serão estornados. "
                      : "") +
                    (confirmation === "voltar-produzir"
                      ? "As produções deste pedido serão reabertas."
                      : ["voltar-rascunho", "voltar-enviado"].includes(
                            confirmation,
                          )
                        ? "Os planejamentos serão cancelados e as peças já produzidas ficarão no estoque."
                        : "As peças continuarão reservadas."))
              : confirmation.startsWith("produzir/") &&
                  expected &&
                  expected.slice(0, 16) > localNow().slice(0, 16)
                ? "A impressão está prevista para terminar em " +
                  stamp(expected) +
                  ". Confirme apenas se a peça já saiu da impressora. Registrar a produção agora?"
                : (
                    {
                      cancelar: "Cancelar este rascunho?",
                      aprovar: "Aprovar o pedido e reservar as peças?",
                      revisar: "Voltar esta proposta para rascunho?",
                      entregar: "Registrar a entrega do pedido?",
                      pagar: "Registrar o pagamento do pedido?",
                      produzir: "Confirmar a produção deste item?",
                    } as Record<string, string>
                  )[confirmation.split("/")[0]]}
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
