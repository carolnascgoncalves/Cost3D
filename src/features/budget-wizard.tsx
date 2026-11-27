import { formatHourInput } from "./budget-time";
import { proposalMessage } from "./proposal-document";
import { useStoreName } from "@/theme/provider";
import { Empty, SearchEmpty } from "@/components/ui";
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
import { addDays, localNow, weekday } from "./planning-dates";
import { openWebsite } from "./website";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";
import { request } from "@/api/session";
import type { Customer, CustomerInput, CustomerList } from "./contracts";
import { operationKey } from "./operation-key";
import {
  Avatar,
  Stepper,
  Steps,
  money,
  row,
  statusBadge,
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
    descontoInformado: "",
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
function WhatsAppGlyph() {
  const t = useTheme();
  return (
    <View
      style={{
        width: 18,
        height: 18,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          width: 15,
          height: 15,
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: t.onPrimary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="telephone" color={t.onPrimary} size={9} />
      </View>
      <View
        style={{
          position: "absolute",
          left: 1,
          bottom: 1,
          width: 5,
          height: 5,
          borderLeftWidth: 1.5,
          borderBottomWidth: 1.5,
          borderColor: t.onPrimary,
          backgroundColor: t.primary,
          transform: [{ rotate: "-20deg" }],
        }}
      />
    </View>
  );
}
function Expand({
  title,
  note,
  children,
  icon,
  embedded = false,
  separated = false,
}: {
  title: string;
  icon?: IconName;
  note?: string;
  children: React.ReactNode;
  embedded?: boolean;
  separated?: boolean;
}) {
  const t = useTheme();
  const [shown, set] = useState(false);
  return (
    <Card
      style={
        embedded
          ? {
              padding: 0,
              gap: 0,
              borderWidth: 0,
              backgroundColor: "transparent",
            }
          : undefined
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: shown }}
        onPress={() => set(!shown)}
        style={{
          ...row,
          minHeight: embedded ? 48 : undefined,
          borderTopWidth: embedded && separated ? 1 : 0,
          borderColor: t.border,
          paddingTop: embedded && separated ? 8 : 0,
        }}
      >
        {icon && <Icon name={icon} color={t.primaryText} size={22} />}
        <View style={{ flex: 1 }}>
          <Body strong>{title}</Body>
          {!!note && <Body muted>{note}</Body>}
        </View>
        <Body>{shown ? "⌄" : "›"}</Body>
      </Pressable>
      {shown && (
        <View
          style={{
            gap: 8,
            paddingTop: 8,
            paddingBottom: embedded ? 12 : 0,
            borderTopWidth: embedded ? 1 : 0,
            borderColor: t.border,
          }}
        >
          {children}
        </View>
      )}
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
    [freteText, setFreteText] = useState<string | null>(null),
    [shippingExpanded, setShippingExpanded] = useState(false),
    [saved, setSaved] = useState<Detail>(),
    [preview, setPreview] = useState<Detail>(),
    [previewLoading, setPreviewLoading] = useState(false),
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
    [newCustomerSheet, setNewCustomerSheet] = useState(false),
    [newCustomer, setNewCustomer] = useState<CustomerInput>({
      nome: "",
      telefone: "",
      email: "",
      observacoes: "",
    }),
    [savingCustomer, setSavingCustomer] = useState(false),
    [search, find] = useState(""),
    [selection, selectPieces] = useState<Line[] | null>(null),
    [priceEdit, editPrice] = useState<{ i: number; value: number } | null>(
      null,
    ),
    [pieceSearch, findPiece] = useState(""),
    [page, setPage] = useState(0),
    [week, setWeek] = useState(() =>
      addDays(localNow().slice(0, 10), -localWeekday()),
    );
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
  const customerLock = useRef(false);
  function apply(d: Detail) {
    setSaved(d);
    setPreview(d);
    setLines(d.itens);
    setFreteText(null);
    setForm({
      ...initial(),
      ...d.dados,
      cliente: d.dados.cliente ?? "",
      email: d.dados.email ?? "",
      contato: d.dados.contato ?? "",
      observacoes: d.dados.observacoes ?? "",
      descontoInformado:
        !d.dados.descontoInformado ||
        Number(d.dados.descontoInformado.replace("%", "").replace(",", ".")) ===
          0
          ? ""
          : d.dados.descontoInformado,
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
  async function createCustomer() {
    if (customerLock.current) return;
    if (newCustomer.nome.trim().length < 2) {
      setError("Informe o nome do cliente com pelo menos 2 caracteres.");
      return;
    }
    if (!(
      newCustomer.email?.trim() || newCustomer.telefone?.replace(/\D/g, "")
    )) {
      setError("Informe pelo menos um contato: telefone ou e-mail.");
      return;
    }
    customerLock.current = true;
    setSavingCustomer(true);
    setError("");
    try {
      const savedCustomer = await request<Customer>("/clientes", {
        method: "POST",
        body: JSON.stringify({
          ...newCustomer,
          nome: newCustomer.nome.trim(),
          telefone: newCustomer.telefone?.trim(),
          email: newCustomer.email?.trim(),
        }),
      });
      setForm((current) => ({
        ...current,
        compradorId: savedCustomer.id,
        cliente: savedCustomer.nome || "",
        contato: savedCustomer.telefone || "",
        email: savedCustomer.email || "",
      }));
      setNewCustomerSheet(false);
      setStage(1);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Não foi possível cadastrar o cliente.",
      );
    } finally {
      setSavingCustomer(false);
      customerLock.current = false;
    }
  }
  function update(i: number, patch: Partial<Line>) {
    setLines((list) => list.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  }
  const body = JSON.stringify({
    revisao: saved?.resumo.revisao,
    dados: {
      ...form,
      descontoInformado:
        form.descontoInformado
          .trim()
          .replace(/^R\$\s*/i, "")
          .replace(/[.,]$/, "") || "0",
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
      form.inicioPretendido.slice(0, 10) < localNow().slice(0, 10) ||
      !form.turnoInicio ||
      !form.turnoFim ||
      !form.inicioPretendido.slice(11)
    )
      return;
    let active = true;
    setPreviewLoading(true);
    const timer = setTimeout(() => {
      request<Detail>("/orcamentos/" + savedId + "/previa", {
        method: "PUT",
        body,
      })
        .then((d) => {
          if (active) {
            setPreview(d);
            setPreviewLoading(false);
            setError("");
          }
        })
        .catch((e) => {
          if (active) {
            setPreview(undefined);
            setPreviewLoading(false);
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
    today = localNow().slice(0, 10),
    selectedDateIsPast = day < today,
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
    );
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
        titleAccessory={
          readonly && saved
            ? (() => {
                const badge = statusBadge(
                  saved.resumo.status,
                  saved.resumo.pago,
                  t,
                );
                return (
                  <Text
                    numberOfLines={1}
                    style={{
                      color: badge.fg,
                      backgroundColor: badge.bg,
                      borderRadius: 8,
                      paddingHorizontal: 9,
                      paddingVertical: 5,
                      fontSize: 12,
                      fontWeight: "600",
                      maxWidth: 136,
                    }}
                  >
                    {saved.resumo.pago ? "Pago" : saved.resumo.situacao}
                  </Text>
                );
              })()
            : undefined
        }
        onBack={back}
      >
        {!readonly && <Steps step={view} />}
        {readonly && saved && (
          <>
            <Text style={{ color: t.muted, fontSize: 12 }}>
              {saved.resumo.cliente || "Cliente"} · entrega prevista{" "}
              {end ? end.slice(8, 10) + "/" + end.slice(5, 7) : "a confirmar"}
            </Text>
            {!["RASCUNHO", "CANCELADO"].includes(saved.resumo.status) &&
              (() => {
                const current = saved.resumo.pago
                  ? 3
                  : ((
                      {
                        ENVIADO: 0,
                        APROVADO: 1,
                        PRONTO: 2,
                        ENTREGUE: 3,
                      } as Record<string, number>
                    )[saved.resumo.status] ?? 0);
                return (
                  <View style={{ flexDirection: "row", paddingVertical: 6 }}>
                    {["Enviado", "Produção", "Entrega", "Pagamento"].map(
                      (label, i) => (
                        <View
                          key={label}
                          style={{ flex: 1, alignItems: "center" }}
                        >
                          {i < 3 && (
                            <View
                              style={{
                                position: "absolute",
                                left: "50%",
                                top: 11,
                                width: "100%",
                                height: 2,
                                backgroundColor:
                                  i < current ? t.primary : t.border,
                              }}
                            />
                          )}
                          <View
                            style={{
                              width: 24,
                              height: 24,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: 12,
                              backgroundColor:
                                i < current ? t.primary : t.accentTint,
                              borderWidth: i === current ? 2 : 0,
                              borderColor: t.primary,
                            }}
                          >
                            <Text
                              style={{
                                color: i < current ? t.onPrimary : t.text,
                                fontSize: 11,
                                fontWeight: "700",
                              }}
                            >
                              {i < current ? "✓" : i + 1}
                            </Text>
                          </View>
                          <Text
                            style={{
                              color: i === current ? t.primaryText : t.muted,
                              fontSize: 10,
                              fontWeight: i === current ? "700" : "400",
                            }}
                          >
                            {label}
                          </Text>
                        </View>
                      ),
                    )}
                  </View>
                );
              })()}
          </>
        )}
        {!!error && <Notice message={error} />}
        {stage === 0 && (
          <>
            <Card>
              <Body strong>Para quem é o orçamento?</Body>
              <Button
                label="Buscar cliente"
                icon="search"
                variant="secondary"
                onPress={() => customers(true)}
              />
              <Button
                label="Cadastrar cliente"
                icon="person"
                variant="ghost"
                onPress={() => {
                  setError("");
                  setNewCustomer({
                    nome: form.cliente,
                    telefone: form.contato,
                    email: form.email,
                    observacoes: "",
                  });
                  setNewCustomerSheet(true);
                }}
              />
            </Card>
            {!!form.cliente.trim() && (
              <Card style={{ ...row, padding: 12 }}>
                <Avatar name={form.cliente} size={42} />
                <View style={{ flex: 1 }}>
                  <Body strong>{form.cliente}</Body>
                  <Body muted>{phone(form.contato) || form.email}</Body>
                </View>
                <Button
                  label="Trocar"
                  variant="ghost"
                  compact
                  onPress={() => customers(true)}
                />
              </Card>
            )}
          </>
        )}
        {stage === 1 && (
          <>
            <Card style={{ ...row, padding: 12 }}>
              <Avatar name={form.cliente} size={44} />
              <View style={{ flex: 1 }}>
                <Body strong>{form.cliente || "Cliente a informar"}</Body>
                {!!form.contato && <Body muted>{phone(form.contato)}</Body>}
              </View>
              <Button
                label="Trocar"
                variant="ghost"
                onPress={() => setStage(0)}
              />
            </Card>
            <View
              style={{ ...row, justifyContent: "space-between", marginTop: 4 }}
            >
              <Body strong>
                {"Peças · " + lines.reduce((n, l) => n + l.quantidade, 0)}
              </Body>
              <Button
                label="Adicionar peça"
                icon="bag-plus"
                variant="ghost"
                onPress={() => {
                  findPiece("");
                  selectPieces([...lines]);
                }}
              />
            </View>
            {lines.map((l, i) => (
              <Card key={l.id || l.referencia}>
                <View style={{ ...row, alignItems: "flex-start" }}>
                  <CalculationPhoto
                    id={l.referencia ?? undefined}
                    name={l.nome}
                    size={44}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Body strong>{l.nome}</Body>
                    <Body muted>{l.material}</Body>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remover ${l.nome}`}
                    hitSlop={8}
                    onPress={() =>
                      setLines((current) =>
                        current.filter((_, index) => index !== i),
                      )
                    }
                    style={{
                      width: 30,
                      height: 30,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 14,
                        height: 14,
                        borderWidth: 1.5,
                        borderColor: t.muted,
                        borderTopWidth: 0,
                        borderBottomLeftRadius: 2,
                        borderBottomRightRadius: 2,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 1,
                          backgroundColor: t.muted,
                        }}
                      />
                    </View>
                    <View
                      style={{
                        position: "absolute",
                        top: 7,
                        width: 17,
                        height: 1.5,
                        backgroundColor: t.muted,
                        borderRadius: 1,
                      }}
                    />
                    <View
                      style={{
                        position: "absolute",
                        top: 5,
                        width: 6,
                        height: 2,
                        borderTopLeftRadius: 2,
                        borderTopRightRadius: 2,
                        borderWidth: 1,
                        borderBottomWidth: 0,
                        borderColor: t.muted,
                      }}
                    />
                  </Pressable>
                </View>
                <Stepper
                  label="Quantidade"
                  min={1}
                  max={500}
                  value={l.quantidade}
                  change={(n) =>
                    update(i, { quantidade: n, estoque: Math.min(l.livre, n) })
                  }
                />
                {l.estoque >= l.quantidade ? (
                  <Text
                    style={{
                      alignSelf: "flex-start",
                      color: t.success,
                      backgroundColor: "#E5F3E8",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      fontSize: 12,
                    }}
                  >
                    {l.quantidade} sai do estoque
                  </Text>
                ) : (
                  <Text
                    style={{
                      alignSelf: "flex-start",
                      color: "#765700",
                      backgroundColor: "#FFF1C2",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      fontSize: 12,
                    }}
                  >
                    {l.quantidade - l.estoque} a produzir · sem estoque
                  </Text>
                )}
              </Card>
            ))}
            {!lines.length && (
              <Empty
                title="Nenhuma peça selecionada"
                description="Adicione uma peça para continuar com o orçamento."
              />
            )}
          </>
        )}
        {stage === 2 && (
          <>
            <Card
              style={{ backgroundColor: t.primary, borderColor: t.primary }}
            >
              <Text style={{ color: t.onPrimary, fontSize: 13 }}>
                Previsão de entrega
              </Text>
              <Text
                style={{ fontSize: 23, fontWeight: "700", color: t.onPrimary }}
              >
                {selectedDateIsPast
                  ? "Escolha uma data a partir de hoje"
                  : previewLoading
                    ? "Atualizando previsão…"
                    : end
                      ? weekday(end.slice(0, 10)) + ", " + stamp(end)
                      : "A confirmar"}
              </Text>
            </Card>
            <View style={{ ...row, alignItems: "stretch" }}>
              <Card
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  backgroundColor: t.accentTint,
                }}
              >
                <Body muted>Duração total</Body>
                <Body strong>
                  {Math.floor(duration / 60)} h {duration % 60} min
                </Body>
              </Card>
              <Card
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  paddingHorizontal: 10,
                  backgroundColor: t.accentTint,
                }}
              >
                <Body muted>Folga aplicada</Body>
                <Body strong>{form.folga}%</Body>
              </Card>
            </View>
            <Card>
              <Body strong>Quando começar a produção?</Body>
              <View style={row}>
                <Pressable
                  accessibilityLabel="Semana anterior"
                  accessibilityState={{ disabled: addDays(week, -1) < today }}
                  disabled={addDays(week, -1) < today}
                  onPress={() => setWeek(addDays(week, -7))}
                >
                  <Body muted={addDays(week, -1) < today}>‹</Body>
                </Pressable>
                {Array.from({ length: 7 }, (_, i) => addDays(week, i)).map(
                  (d) => (
                    <Pressable
                      key={d}
                      accessibilityState={{
                        disabled: d < today,
                        selected: d === day,
                      }}
                      disabled={d < today}
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
                        opacity: d < today ? 0.4 : 1,
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
              {occupiedOn(day).length ? (
                <View style={{ ...row, gap: 6 }}>
                  <Icon name="printer" color={t.primaryText} size={15} />
                  <Body muted>
                    {occupiedOn(day).length}{" "}
                    {occupiedOn(day).length === 1
                      ? "impressão agendada"
                      : "impressões agendadas"}{" "}
                    neste dia ·{" "}
                    {
                      occupiedOn(day)
                        .map((o) => o.inicio.slice(11, 16))
                        .sort()[0]
                    }{" "}
                    às{" "}
                    {occupiedOn(day)
                      .map((o) => o.fim.slice(11, 16))
                      .sort()
                      .at(-1)}
                  </Body>
                </View>
              ) : (
                <View style={{ ...row, gap: 6 }}>
                  <Icon name="printer" color={t.muted} size={15} />
                  <Body muted>Nenhuma impressão agendada neste dia.</Body>
                </View>
              )}
              <HourField
                label="Horário de início"
                value={form.inicioPretendido.slice(11)}
                change={(v) => field("inicioPretendido", day + "T" + v)}
              />
            </Card>
            <Card style={{ gap: 0 }}>
              <Expand
                embedded
                icon="clock-history"
                title="Expediente"
                note={
                  form.turnoInicio.slice(0, 5) +
                  " – " +
                  form.turnoFim.slice(0, 5)
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
                embedded
                separated
                icon="gear"
                title="Intervalo"
                note={form.intervalo + " min · folga " + form.folga + "%"}
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
            </Card>
            {!!preview?.aviso && <Notice message={preview.aviso} />}
          </>
        )}
        {stage === 3 && (
          <>
            <Card style={{ gap: 0, paddingVertical: 8 }}>
              {lines.map((l, i) => (
                <View
                  key={l.id || i}
                  style={{
                    borderTopWidth: i ? 1 : 0,
                    borderColor: t.border,
                    paddingVertical: 7,
                    gap: 1,
                  }}
                >
                  <View style={{ ...row, justifyContent: "space-between" }}>
                    <View style={{ flex: 1 }}>
                      <Body strong>{l.nome}</Body>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={"Editar preço de " + l.nome}
                      onPress={() => editPrice({ i, value: l.preco })}
                      style={{ ...row, minHeight: 32 }}
                    >
                      <Body strong>{money(l.preco)}</Body>
                      <Icon name="pencil" color={t.primaryText} size={15} />
                    </Pressable>
                  </View>
                  <Body muted>{l.quantidade} un.</Body>
                </View>
              ))}
            </Card>
            <Card>
              <View style={{ ...row, alignItems: "flex-start" }}>
                <View style={{ flex: 1 }}>
                  <Field
                    optional
                    label="Desconto"
                    keyboardType="decimal-pad"
                    value={form.descontoInformado}
                    selectTextOnFocus
                    placeholder="R$ 15 ou 15%"
                    onChangeText={(v) => {
                      if (/^\d{0,8}([.,]\d{0,2})?$/.test(v))
                        field("descontoInformado", v);
                    }}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    optional
                    label="Frete"
                    keyboardType="decimal-pad"
                    value={
                      freteText ??
                      (form.frete ? String(form.frete).replace(".", ",") : "")
                    }
                    placeholder="R$ 10,00"
                    onChangeText={(v) => {
                      if (/^\d{0,8}([.,]\d{0,2})?$/.test(v)) {
                        setFreteText(v);
                        field("frete", Number(v.replace(",", ".")) || 0);
                      }
                    }}
                    onBlur={() => setFreteText(null)}
                  />
                </View>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: shippingExpanded }}
                onPress={() => setShippingExpanded(!shippingExpanded)}
                style={{ ...row, minHeight: 40 }}
              >
                <Icon name="box" color={t.primaryText} size={16} />
                <Body>Meu custo de envio e cotação do frete</Body>
                <Body>›</Body>
              </Pressable>
              {shippingExpanded && (
                <>
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
                </>
              )}
            </Card>
            <Card style={{ gap: 8 }}>
              <View
                style={{
                  ...row,
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <View>
                  <Body muted>Lucro estimado</Body>
                  <Text
                    style={{
                      color: profit ? tone[2] : t.text,
                      fontSize: 22,
                      fontWeight: "700",
                    }}
                  >
                    {preview ? money(preview.resultado.lucro) : "—"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Body muted>Margem</Body>
                  <Text
                    style={{ color: t.text, fontSize: 20, fontWeight: "700" }}
                  >
                    {preview
                      ? Number(preview.resultado.margem).toLocaleString(
                          "pt-BR",
                          { maximumFractionDigits: 1 },
                        ) + "%"
                      : "—"}
                  </Text>
                </View>
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
                <Text
                  style={{
                    color: tone[2],
                    backgroundColor: tone[0],
                    borderRadius: 8,
                    paddingHorizontal: 8,
                    paddingVertical: 5,
                    fontSize: 12,
                    alignSelf: "flex-start",
                  }}
                >
                  {profit.titulo}
                </Text>
              )}
            </Card>
          </>
        )}
        {stage === 4 && (
          <>
            {!readonly && <Body strong>Confira a proposta</Body>}
            {(!readonly ||
              !["APROVADO", "PRONTO", "ENTREGUE"].includes(
                saved?.resumo.status ?? "",
              )) && (
              <Card style={{ gap: 0 }}>
                {readonly && (
                  <Text
                    style={{
                      color: t.text,
                      fontSize: 18,
                      fontWeight: "700",
                      marginBottom: 8,
                    }}
                  >
                    Peças
                  </Text>
                )}
                {!readonly && (
                  <>
                    <View
                      style={{
                        ...row,
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Body muted>Cliente</Body>
                        <Body strong>{form.cliente || "A informar"}</Body>
                        {!!form.contato && (
                          <Body muted>{phone(form.contato)}</Body>
                        )}
                      </View>
                      <View style={{ alignItems: "flex-end", flexShrink: 1 }}>
                        <Body muted>Entrega prevista</Body>
                        <Body strong>{stamp(end)}</Body>
                      </View>
                    </View>
                    <View
                      style={{
                        height: 1,
                        backgroundColor: t.border,
                        marginVertical: 10,
                      }}
                    />
                  </>
                )}
                {lines.map((l, i) => (
                  <View key={l.id || i}>
                    {readonly && i > 0 && (
                      <View
                        style={{
                          height: 1,
                          backgroundColor: t.border,
                          marginVertical: 6,
                        }}
                      />
                    )}
                    <View style={{ ...row, gap: 8, paddingVertical: 7 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Body strong>{l.nome}</Body>
                        <Body muted>
                          {l.quantidade} un.
                          {!readonly && " × " + money(l.preco)}
                        </Body>
                      </View>
                      {!readonly && (
                        <Body strong>{money(l.quantidade * l.preco)}</Body>
                      )}
                    </View>
                  </View>
                ))}
                {!readonly && (
                  <View
                    style={{
                      ...row,
                      justifyContent: "space-between",
                      borderTopWidth: 1,
                      borderColor: t.border,
                      paddingTop: 10,
                      marginTop: 8,
                    }}
                  >
                    <Body>Total ao cliente</Body>
                    <Text
                      style={{ fontSize: 20, fontWeight: "700", color: t.text }}
                    >
                      {money(total)}
                    </Text>
                  </View>
                )}
                {!readonly && (
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
                )}
              </Card>
            )}
            {!readonly && (
              <Expand title="Para onde vai o dinheiro">
                <ValueRow
                  label="Produção e envio"
                  value={money(preview?.custo ?? 0)}
                />
                <ValueRow label="Taxas" value={money(preview?.taxas ?? 0)} />
              </Expand>
            )}
            {!readonly && (
              <View style={{ gap: 8 }}>
                <View style={{ ...row, gap: 6 }}>
                  <Body muted>Observações para o cliente</Body>
                  <Text
                    style={{
                      color: t.primaryText,
                      backgroundColor: t.accentTint,
                      borderRadius: 8,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                      fontSize: 11,
                    }}
                  >
                    Opcional
                  </Text>
                </View>
                <Card>
                  <Field
                    optional
                    editable={!readonly}
                    label="Observação"
                    placeholder="Ex.: retirada na loja"
                    value={form.observacoes}
                    onChangeText={(v) => field("observacoes", v)}
                  />
                </Card>
              </View>
            )}
            {!readonly && (
              <>
                <Card>
                  <Body strong>Enviar proposta</Body>
                  <Button
                    stretch
                    iconNode={<WhatsAppGlyph />}
                    label="Enviar pelo WhatsApp"
                    disabled={busy}
                    onPress={() => outbound("WhatsApp")}
                  />
                  <View style={row}>
                    <View style={{ flex: 1 }}>
                      <Button
                        stretch
                        icon="file-text"
                        label="PDF"
                        variant="secondary"
                        disabled={busy}
                        onPress={() => outbound("PDF")}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        stretch
                        icon="envelope"
                        label="E-mail"
                        variant="secondary"
                        disabled={busy}
                        onPress={() => outbound("E-mail")}
                      />
                    </View>
                  </View>
                  <Body muted>
                    Depois de enviar, o app pergunta se deve marcar como
                    enviada.
                  </Body>
                </Card>
                <Expand title="Materiais e reposição · uso interno">
                  {preview?.materiais?.materiais.map((m, i) => (
                    <View key={i} style={row}>
                      <View
                        style={{
                          width: 20,
                          height: 20,
                          borderWidth: 1,
                          borderRadius: 10,
                          borderColor: t.border,
                          backgroundColor: m.codigoCor || t.accentTint,
                        }}
                      />
                      <View style={{ flex: 1 }}>
                        <View
                          style={{
                            ...row,
                            justifyContent: "space-between",
                            gap: 4,
                          }}
                        >
                          <Body strong>{m.nome}</Body>
                          <Body strong>
                            {m.necessario +
                              " g" +
                              (m.falta > 0
                                ? " · faltam " + m.falta + " g"
                                : "")}
                          </Body>
                        </View>
                        <Body>{m.cor}</Body>
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
              </>
            )}
            {!readonly && (
              <Button
                label="Cancelar rascunho"
                variant="danger"
                onPress={() => confirm("cancelar")}
              />
            )}
            {readonly && saved && (
              <>
                {["APROVADO", "PRONTO", "ENTREGUE"].includes(
                  saved.resumo.status,
                ) && (
                  <Card>
                    <View style={{ ...row, justifyContent: "space-between" }}>
                      <Text
                        style={{
                          color: t.text,
                          fontSize: 18,
                          fontWeight: "700",
                        }}
                      >
                        Produção
                      </Text>
                      <Body muted>
                        {
                          lines.filter(
                            (l) => l.pronto || l.estoque >= l.quantidade,
                          ).length
                        }{" "}
                        de {lines.length} prontas
                      </Body>
                    </View>
                    {lines.map((l, index) => {
                      const ready = !!l.pronto || l.estoque >= l.quantidade;
                      return (
                        <View
                          key={l.id}
                          style={{
                            gap: 7,
                            borderTopWidth: index ? 1 : 0,
                            borderColor: t.border,
                            paddingTop: index ? 10 : 0,
                            paddingBottom: 4,
                          }}
                        >
                          <View
                            style={{
                              ...row,
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <View style={{ flex: 1 }}>
                              <Body strong>{l.nome}</Body>
                              <Body muted>
                                {Math.max(0, l.quantidade - l.estoque)} un.
                              </Body>
                            </View>
                            {ready ? (
                              <Text
                                style={{ color: t.success, fontWeight: "700" }}
                              >
                                ✓ Produzido
                              </Text>
                            ) : (
                              <Button
                                icon="printer"
                                variant="secondary"
                                label="Registrar produção"
                                disabled={busy}
                                onPress={() => confirm("produzir/" + l.id)}
                              />
                            )}
                          </View>
                        </View>
                      );
                    })}
                    <Body muted>
                      Quando todas as peças estiverem prontas, o pedido passa
                      para entrega.
                    </Body>
                  </Card>
                )}
                <Card>
                  <View style={{ ...row, justifyContent: "space-between" }}>
                    <Body strong>Total ao cliente</Body>
                    <Text
                      style={{ color: t.text, fontSize: 22, fontWeight: "700" }}
                    >
                      {money(saved.resumo.total)}
                    </Text>
                  </View>
                  <View style={{ ...row, justifyContent: "space-between" }}>
                    <Body muted>Lucro estimado</Body>
                    <Text
                      style={{
                        color: (profit?.lucro ?? 0) < 0 ? t.danger : t.success,
                        fontWeight: "700",
                      }}
                    >
                      {money(profit?.lucro ?? 0)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      alignSelf: "flex-start",
                      color: saved.resumo.pago ? t.success : "#765700",
                      backgroundColor: saved.resumo.pago
                        ? "#E5F3E8"
                        : "#FFF1C2",
                      borderRadius: 8,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      fontSize: 12,
                    }}
                  >
                    {saved.resumo.pago
                      ? "Pagamento efetuado"
                      : "Pagamento pendente"}
                  </Text>
                </Card>
                <Card style={{ gap: 0 }}>
                  <Expand embedded title="Para onde vai o dinheiro">
                    <ValueRow
                      label="Produção e envio"
                      value={money(preview?.custo ?? 0)}
                    />
                    <ValueRow
                      label="Taxas"
                      value={money(preview?.taxas ?? 0)}
                    />
                  </Expand>
                  <Expand embedded separated title="Compartilhar e materiais">
                    <View>
                      <Button
                        stretch
                        iconNode={<WhatsAppGlyph />}
                        label="WhatsApp"
                        onPress={() => outbound("WhatsApp")}
                      />
                    </View>
                    <View style={row}>
                      <View style={{ flex: 1 }}>
                        <Button
                          stretch
                          icon="file-text"
                          label="PDF"
                          variant="secondary"
                          onPress={() => outbound("PDF")}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          stretch
                          icon="envelope"
                          label="E-mail"
                          variant="secondary"
                          onPress={() => outbound("E-mail")}
                        />
                      </View>
                    </View>
                    {preview?.materiais?.materiais.map((m, i) => (
                      <View key={i} style={row}>
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 1,
                            borderColor: t.border,
                            backgroundColor: m.codigoCor || t.accentTint,
                          }}
                        />
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              ...row,
                              justifyContent: "space-between",
                              gap: 4,
                            }}
                          >
                            <Body strong>{m.nome}</Body>
                            <Body strong>
                              {m.necessario +
                                " g" +
                                (m.falta > 0
                                  ? " · faltam " + m.falta + " g"
                                  : "")}
                            </Body>
                          </View>
                          <Body>{m.cor}</Body>
                        </View>
                      </View>
                    ))}
                    {preview?.materiais && (
                      <ValueRow
                        label="Reposição"
                        value={money(preview.materiais.reposicao)}
                      />
                    )}
                  </Expand>
                  <Expand embedded separated title="Observação para o cliente">
                    <Body muted>{form.observacoes || "Sem observações."}</Body>
                  </Expand>
                </Card>
              </>
            )}
          </>
        )}
      </ModuleScreen>
      {readonly && saved && !hidesFooter && (
        <View
          style={{
            backgroundColor: t.surface,
            borderTopWidth: 1,
            borderColor: t.border,
            paddingHorizontal: 16,
            paddingVertical: 9,
          }}
        >
          <View style={{ ...row, alignItems: "stretch" }}>
            <View style={{ flex: 1 }}>
              {saved.resumo.status === "ENVIADO" ? (
                <Button
                  stretch
                  icon="send"
                  label="Aprovar pedido"
                  disabled={busy}
                  onPress={() => confirm("aprovar")}
                />
              ) : saved.resumo.status === "PRONTO" ? (
                <Button
                  stretch
                  icon="box"
                  label="Registrar entrega"
                  disabled={busy}
                  onPress={() => confirm("entregar")}
                />
              ) : saved.resumo.status === "ENTREGUE" && !saved.resumo.pago ? (
                <Button
                  stretch
                  icon="cash-coin"
                  label="Registrar pagamento"
                  disabled={busy}
                  onPress={() => confirm("pagar")}
                />
              ) : (
                <Button
                  stretch
                  icon={saved.resumo.pago ? "cash-coin" : "printer"}
                  label={
                    saved.resumo.pago
                      ? "Pagamento efetuado"
                      : saved.resumo.status === "APROVADO"
                        ? "Produção em andamento"
                        : "Proposta cancelada"
                  }
                  variant="secondary"
                  disabled
                  onPress={() => {}}
                />
              )}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Mais opções da proposta"
              onPress={() => setEditingPhase(true)}
              style={{
                minWidth: 44,
                minHeight: 44,
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: t.border,
                backgroundColor: t.surface,
                borderRadius: 10,
              }}
            >
              <Icon name="three-dots" color={t.primaryText} size={18} />
            </Pressable>
          </View>
        </View>
      )}
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
              paddingTop: 10,
            }}
          >
            <Body>Total do orçamento</Body>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: "700" }}>
              {money(total)}
            </Text>
          </View>
          <View
            style={{
              ...row,
              alignItems: "stretch",
              paddingHorizontal: 16,
              paddingVertical: 9,
            }}
          >
            <View style={{ flex: 0.8 }}>
              <Button
                stretch
                compact={stage === 4}
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
            <View style={{ flex: 1.2 }}>
              <Button
                stretch
                compact={stage === 4}
                label={stage === 4 ? "Marcar como enviada" : "Continuar"}
                busy={busy}
                disabled={
                  (stage === 3 && priceEdit !== null) ||
                  (stage === 1 && !lines.length) ||
                  (stage === 2 &&
                    (selectedDateIsPast ||
                      !form.turnoInicio ||
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
      {priceEdit && (
        <PlanningSheet
          footer={
            <Button
              label="Salvar preço"
              disabled={priceEdit.value <= 0}
              onPress={() => {
                update(priceEdit.i, { preco: priceEdit.value });
                editPrice(null);
              }}
            />
          }
          title="Editar preço por unidade"
          close={() => editPrice(null)}
        >
          <Body strong>{lines[priceEdit.i].nome}</Body>
          <Body muted>Preço atual · {money(lines[priceEdit.i].preco)}</Body>
          <Amount
            label="Novo preço por unidade (R$)"
            value={priceEdit.value}
            change={(v) => editPrice({ i: priceEdit.i, value: v })}
          />
          <Button
            label="Cancelar"
            variant="secondary"
            onPress={() => editPrice(null)}
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
      {newCustomerSheet && (
        <PlanningSheet
          title="Cadastrar cliente"
          close={() => setNewCustomerSheet(false)}
          footer={
            <Button
              label="Cadastrar e continuar"
              busy={savingCustomer}
              onPress={() => void createCustomer()}
            />
          }
        >
          <Body muted>
            O cliente ficará salvo na sua lista e será vinculado a este
            orçamento.
          </Body>
          {!!error && <Notice message={error} />}
          <Field
            label="Nome do cliente"
            value={newCustomer.nome}
            onChangeText={(nome) =>
              setNewCustomer((current) => ({ ...current, nome }))
            }
            placeholder="Nome do cliente"
          />
          <Field
            label="Telefone / WhatsApp"
            value={newCustomer.telefone || ""}
            onChangeText={(telefone) =>
              setNewCustomer((current) => ({ ...current, telefone }))
            }
            keyboardType="phone-pad"
            placeholder="Telefone com DDD"
          />
          <Field
            label="E-mail"
            value={newCustomer.email || ""}
            onChangeText={(email) =>
              setNewCustomer((current) => ({ ...current, email }))
            }
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="cliente@exemplo.com"
          />
        </PlanningSheet>
      )}
      {editingPhase && !confirmation && saved && (
        <PlanningSheet
          title="Opções da proposta"
          close={() => setEditingPhase(false)}
        >
          {earlier.length > 0 && (
            <Body muted>Voltar para uma fase anterior</Body>
          )}
          {earlier.map(([key, label]) => (
            <Button
              key={key}
              label={label}
              variant="secondary"
              onPress={() => confirm("voltar-" + key)}
            />
          ))}
          {saved.resumo.arquivado ? (
            <Button
              label="Restaurar proposta"
              variant="secondary"
              onPress={() => confirm("restaurar")}
            />
          ) : !["ENVIADO", "APROVADO", "PRONTO"].includes(
              saved.resumo.status,
            ) ? (
            <Button
              label="Arquivar proposta"
              variant="secondary"
              onPress={() => confirm("arquivar")}
            />
          ) : null}
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
              : confirmation.startsWith("produzir/")
                ? "Registrar produção de " +
                  (lines.find((l) => l.id === confirmation.split("/")[1])
                    ?.nome ?? "peça") +
                  "? " +
                  (expected && expected.slice(0, 16) > localNow().slice(0, 16)
                    ? "A previsão é " +
                      stamp(expected) +
                      ". Confirme só se a peça já saiu da impressora."
                    : "Confirme só se a peça já saiu da impressora.")
                : (
                    {
                      cancelar: "Cancelar este rascunho?",
                      aprovar: "Aprovar o pedido e reservar as peças?",
                      revisar: "Voltar esta proposta para rascunho?",
                      entregar: "Registrar a entrega do pedido?",
                      pagar: "Registrar o pagamento do pedido?",
                      produzir: "Confirmar a produção deste item?",
                      arquivar:
                        "Arquivar esta proposta? Ela continuará disponível na aba Arquivados.",
                      restaurar: "Restaurar esta proposta para a aba Ativos?",
                    } as Record<string, string>
                  )[confirmation.split("/")[0]]}
          </Body>
          {!!error && <Notice message={error} />}
          <Button
            label={
              confirmation.startsWith("produzir/")
                ? "Sim, registrar"
                : confirmation === "arquivar"
                  ? "Sim, arquivar"
                  : confirmation === "restaurar"
                    ? "Restaurar"
                    : "Sim, continuar"
            }
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
