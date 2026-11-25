import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { operationKey } from "./operation-key";

import { useTheme } from "@/theme/provider";
import { request, ApiError } from "@/api/session";
import type { components } from "@/api/schema";
import { router } from "expo-router";
import { ModuleScreen } from "@/components/module-screen";
import {
  Badge,
  Body,
  Button,
  Card,
  Field,
  Notice,
  ValueRow,
  layout,
} from "@/components/ui";
import type { CatalogRow } from "@/components/catalog-card";
import { CalculationIdentity, Picker } from "./mobile-calculations";
import { useApiQuery } from "@/hooks/use-api-query";
import { decimal, reais } from "./format";
type Detail = components["schemas"]["DetalheLote"];
const money = (n?: number) => reais(n == null ? undefined : String(n));
function amount(s: string) {
  if (!s.trim()) return undefined;
  if (!/^\d+(?:[.,]\d{1,2})?$/.test(s.trim()))
    throw new Error("Confira o valor informado. Use até duas casas decimais.");
  return Number(s.replace(",", "."));
}
export function LotOperation({
  id,
  onBack,
}: {
  id: string;
  onBack: () => void;
}) {
  const t = useTheme();
  const path = "/vendas/" + id,
    q = useApiQuery<Detail>(path);
  const [sheet, setSheet] = useState(false),
    [costDetails, setCostDetails] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [units, setUnits] = useState("1"),
    [price, setPrice] = useState(""),
    [discount, setDiscount] = useState(""),
    [fees, setFees] = useState(""),
    [advanced, setAdvanced] = useState(false);
  const [desc, setDesc] = useState(""),
    [cost, setCost] = useState(""),
    [loss, setLoss] = useState(false),
    [material, setMaterial] = useState<CatalogRow & { id: string }>(),
    [grams, setGrams] = useState(""),
    [lossUnits, setLossUnits] = useState("1"),
    [minutes, setMinutes] = useState("0"),
    [note, setNote] = useState("");
  const pending = useRef(false),
    attempt = useRef({ signature: "", key: "" });
  const d = q.data;
  const [confirmation, setConfirmation] = useState("");
  const sold =
    !!d?.produzido && (d.vendidas ?? 0) > 0 && d.vendidas === d.unidades;
  const canSell = !!d?.produzido && (d.disponiveis ?? 0) > 0;
  function original() {
    router.push({ pathname: "/calculate", params: { modo: "detalhe", id } });
  }

  async function act(
    action: "producao" | "venda" | "custos" | "perdas" | "cancelamento",
    sale?: NonNullable<Detail["vendas"]>[number],
  ) {
    if (pending.current || !d) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let body: Record<string, unknown> = {};
      if (action === "venda") {
        if (!/^\d+$/.test(units) || +units < 1 || +units > (d.disponiveis ?? 0))
          throw new Error(
            "Informe a quantidade de unidades disponíveis para venda.",
          );
        body = {
          unidades: +units,
          preco: advanced ? amount(price) : undefined,
          desconto: advanced ? amount(discount) : undefined,
          taxas: advanced ? amount(fees) : undefined,
        };
      }
      if (action === "custos") {
        const valor = amount(cost);
        if (desc.trim().length < 2 || !valor)
          throw new Error("Informe uma descrição e o valor total do gasto.");
        body = { descricao: desc.trim(), valor };
      }
      if (action === "perdas") {
        if (
          !material ||
          !/^\d+([.,]\d+)?$/.test(grams) ||
          Number(grams.replace(",", ".")) <= 0 ||
          !/^\d+$/.test(lossUnits) ||
          +lossUnits < 1 ||
          !/^\d+$/.test(minutes)
        )
          throw new Error(
            "Confira o filamento, os gramas perdidos, as unidades e os minutos.",
          );
        body = {
          filamentoId: material.id,
          gramas: Number(grams.replace(",", ".")),
          unidades: +lossUnits,
          minutos: +minutes,
          observacao: note,
        };
      }
      if (action === "cancelamento" && sale)
        body = { vendaId: sale.id, unidades: sale.unidades };
      const signature = action + JSON.stringify(body);
      if (action !== "producao") {
        if (attempt.current.signature !== signature)
          attempt.current = { signature, key: operationKey() };
        body.chave = attempt.current.key;
      }
      await request(path + "/" + action, {
        method: "POST",
        body: action === "producao" ? undefined : JSON.stringify(body),
      });
      attempt.current.signature = "";
      setMessage(
        {
          producao: "Produção registrada.",
          venda: "Venda registrada.",
          cancelamento: "Venda cancelada.",
          custos: "Custo adicionado.",
          perdas: "Perda registrada.",
        }[action],
      );
      if (action === "venda") {
        setUnits("1");
        setPrice("");
        setDiscount("");
        setFees("");
      }
      if (action === "custos") {
        setDesc("");
        setCost("");
      }
      if (action === "perdas") {
        setLoss(false);
        setGrams("");
        setMinutes("0");
        setLossUnits("1");
        setNote("");
      }
      setConfirmation("");
      setSheet(false);
      q.retry();
    } catch (e) {
      if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
        attempt.current.signature = "";
        q.retry();
      }
      setError(e instanceof Error ? e.message : "Não foi possível concluir.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const status = !d?.produzido
    ? "Aguardando produção"
    : sold
      ? "Vendido"
      : canSell
        ? "Pronto para vender"
        : "Reservado";
  const footer = {
    padding: 12,
    backgroundColor: t.surface,
    borderTopWidth: 1,
    borderColor: t.border,
  };
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        lightHeader
        section="Vendas e estoque"
        title="Lote"
        onBack={onBack}
      >
        {!!message && <Badge>{message}</Badge>}
        {!!error && !sheet && <Notice message={error} />}
        {q.loading ? (
          <ActivityIndicator />
        ) : q.error ? (
          <Notice message={q.error} onRetry={q.retry} />
        ) : (
          d && (
            <>
              <Card>
                <CalculationIdentity id={id} name={d.nome} />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 6,
                  }}
                >
                  <Body muted>
                    {d.impressora} · {d.unidades} un. no lote
                  </Body>
                  <Text
                    style={{
                      borderRadius: 12,
                      paddingHorizontal: 9,
                      paddingVertical: 4,
                      backgroundColor: d.produzido ? "#e4f2e9" : t.accentTint,
                      color: d.produzido ? "#215f3a" : t.primaryText,
                    }}
                  >
                    {status}
                  </Text>
                </View>
                {!sold && (
                  <Text
                    accessibilityRole="button"
                    onPress={original}
                    style={{
                      color: t.primaryText,
                      fontWeight: "600",
                      paddingVertical: 6,
                    }}
                  >
                    Ver cálculo original ›
                  </Text>
                )}
              </Card>
              <View style={layout.row}>
                {[
                  d.produzido ? "✓ 1. Produzir" : "1. Produzir",
                  sold ? "✓ 2. Vender" : "2. Vender",
                ].map((label, i) => {
                  const done = i === 0 ? d.produzido : sold,
                    current = i === 0 ? !d.produzido : canSell;
                  return (
                    <Text
                      key={i}
                      style={{
                        borderRadius: 12,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        color: done
                          ? "#215f3a"
                          : current
                            ? t.onPrimary
                            : t.muted,
                        backgroundColor: done
                          ? "#e4f2e9"
                          : current
                            ? t.primary
                            : t.accentTint,
                      }}
                    >
                      {label}
                    </Text>
                  );
                })}
              </View>
              {!!d.reservadas && (
                <Body muted>
                  {d.reservadas} un.{" "}
                  {d.reservadas === 1 ? "reservada" : "reservadas"} para pedidos
                </Body>
              )}
              {!d.produzido && (
                <>
                  <Card>
                    <Body muted>Custo previsto do lote</Body>
                    <Text
                      style={{ fontSize: 26, color: t.text, fontWeight: "700" }}
                    >
                      {money(d.custoLote)}
                    </Text>
                    <Body muted>{money(d.custoUnitario)} por unidade</Body>
                  </Card>
                  <Card>
                    <Body strong>Filamentos que serão usados</Body>
                    {d.materiais?.map((m, i) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          borderBottomWidth: 1,
                          borderColor: t.border,
                          paddingVertical: 10,
                        }}
                      >
                        <View
                          style={{
                            width: 13,
                            height: 13,
                            borderRadius: 7,
                            borderWidth: 1,
                            borderColor: t.border,
                            backgroundColor: m.corSegura || "#ccc",
                          }}
                        />
                        <View style={{ flex: 1, gap: 3 }}>
                          <Body strong>
                            {[m.nome, m.cor].filter(Boolean).join(" · ")}
                          </Body>
                          <Body muted>
                            Saldo atual:{" "}
                            {m.saldo == null
                              ? "—"
                              : decimal(String(m.saldo)) + " g"}
                          </Body>
                        </View>
                        <View
                          style={{
                            alignItems: "flex-end",
                            maxWidth: "45%",
                            gap: 3,
                          }}
                        >
                          <Body strong>{decimal(String(m.gramas ?? 0))} g</Body>
                        </View>
                      </View>
                    ))}
                  </Card>
                </>
              )}
              {d.produzido && !sold && (
                <Card>
                  <Body muted>Disponível para vender</Body>
                  <Text
                    style={{ fontSize: 26, color: t.text, fontWeight: "700" }}
                  >
                    {d.disponiveis} un.
                  </Text>
                  <Body muted>
                    Produzidas {d.unidades} · Vendidas {d.vendidas}
                  </Body>
                </Card>
              )}
              {canSell && (
                <Card>
                  <Body strong>Registrar venda</Body>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Body>Quantas unidades?</Body>
                    </View>
                    <Button
                      variant="secondary"
                      label="−"
                      disabled={+units <= 1}
                      onPress={() => setUnits(String(+units - 1))}
                    />
                    <Body strong>{units}</Body>
                    <Button
                      variant="secondary"
                      label="+"
                      disabled={+units >= (d.disponiveis ?? 0)}
                      onPress={() => setUnits(String(+units + 1))}
                    />
                  </View>
                  <ValueRow
                    label="Preço por unidade"
                    value={
                      advanced && price
                        ? reais(price.replace(",", "."))
                        : money(d.preco)
                    }
                  />
                  <Button
                    variant="ghost"
                    label={
                      advanced
                        ? "Fechar ajustes"
                        : "Ajustar preço, desconto e taxas ›"
                    }
                    onPress={() => setAdvanced(!advanced)}
                  />
                  {advanced && (
                    <>
                      <Field
                        label="Preço por unidade (R$)"
                        placeholder={money(d.preco)}
                        keyboardType="decimal-pad"
                        value={price}
                        onChangeText={setPrice}
                      />
                      <Field
                        label="Desconto por unidade (R$)"
                        keyboardType="decimal-pad"
                        value={discount}
                        onChangeText={setDiscount}
                      />
                      <Field
                        label="Taxas, impostos e frete por unidade (R$)"
                        keyboardType="decimal-pad"
                        value={fees}
                        onChangeText={setFees}
                      />
                    </>
                  )}
                </Card>
              )}
              {d.vendas?.map((v, i) => {
                const count = v.unidades ?? 0;
                const profit =
                  v.lucro == null
                    ? d.vendas?.filter((x) => x.unidades).length === 1 && count
                      ? d.lucroVendas
                      : undefined
                    : v.lucro * count;
                return (
                  <View key={v.id ?? i} style={{ gap: 8 }}>
                    <Card>
                      <Body strong>
                        {count ? "Venda registrada" : "Venda cancelada"}
                      </Body>
                      <ValueRow
                        label="Data"
                        value={
                          v.data?.slice(0, 10).split("-").reverse().join("/") ??
                          "—"
                        }
                      />
                      <ValueRow label="Unidades" value={count + " un."} />
                      {!!v.canceladas && (
                        <ValueRow
                          label="Canceladas"
                          value={v.canceladas + " un."}
                        />
                      )}
                      <ValueRow
                        label="Preço por unidade"
                        value={money(v.preco ?? d.preco)}
                      />
                      {!!count && (
                        <Card
                          style={{
                            backgroundColor:
                              (profit ?? 0) < 0 ? "#fdecec" : "#e4f2e9",
                          }}
                        >
                          <Body muted>Lucro desta venda</Body>
                          <Text
                            style={{
                              fontSize: 24,
                              fontWeight: "700",
                              color: (profit ?? 0) < 0 ? "#922d34" : "#215f3a",
                            }}
                          >
                            {money(profit)}
                          </Text>
                        </Card>
                      )}
                    </Card>
                    {!!count &&
                      !!v.id &&
                      !v.vinculadaPedido &&
                      (confirmation === v.id ? (
                        <Card>
                          <Body>
                            Cancelar esta venda e devolver {count} un. ao
                            estoque?
                          </Body>
                          <Button
                            variant="danger"
                            label="Confirmar cancelamento"
                            disabled={busy}
                            onPress={() => void act("cancelamento", v)}
                          />
                          <Button
                            variant="ghost"
                            label="Manter venda"
                            onPress={() => setConfirmation("")}
                          />
                        </Card>
                      ) : (
                        <Button
                          variant="danger"
                          label="Cancelar venda"
                          onPress={() => setConfirmation(v.id!)}
                        />
                      ))}
                    {!!count && v.vinculadaPedido && (
                      <Body muted>Venda vinculada a um pedido.</Body>
                    )}
                    <View
                      style={{
                        height: 2,
                        backgroundColor: t.muted,
                        opacity: 0.45,
                        marginVertical: 6,
                      }}
                    />
                  </View>
                );
              })}
              <Card>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setError("");
                    setSheet(true);
                  }}
                >
                  <ValueRow
                    label="Custos extras e perdas"
                    value={money(d.totalExtras) + "  ›"}
                  />
                </Pressable>
              </Card>
              <Modal
                visible={sheet}
                transparent
                animationType="slide"
                onRequestClose={() => setSheet(false)}
              >
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                  style={{
                    flex: 1,
                    backgroundColor: "#21193266",
                    justifyContent: "flex-end",
                  }}
                >
                  <Pressable
                    accessibilityLabel="Fechar custos"
                    onPress={() => setSheet(false)}
                    style={{ flex: 1 }}
                  />
                  <View
                    style={{
                      maxHeight: "88%",
                      backgroundColor: t.surface,
                      borderTopLeftRadius: 22,
                      borderTopRightRadius: 22,
                      padding: 16,
                      gap: 8,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Body strong>Custos do lote</Body>
                      <Button
                        label="Fechar"
                        variant="ghost"
                        onPress={() => setSheet(false)}
                      />
                    </View>
                    {!!error && <Notice message={error} />}
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      contentContainerStyle={{ gap: 8, paddingBottom: 16 }}
                    >
                      <ValueRow
                        label="Custos do cálculo"
                        value={
                          money(
                            (d.incluidos ?? []).reduce(
                              (n, x) => n + (x.valor ?? 0),
                              0,
                            ),
                          ) + " por un."
                        }
                      />
                      <ValueRow
                        label="Só deste lote"
                        value={money(d.totalExtras)}
                      />
                      {(!!d.incluidos?.length ||
                        !!d.personalizados?.length) && (
                        <Button
                          variant="ghost"
                          label={
                            costDetails ? "Ocultar detalhes" : "Detalhar custos"
                          }
                          onPress={() => setCostDetails(!costDetails)}
                        />
                      )}
                      {costDetails && (
                        <>
                          {d.incluidos?.map((x, i) => (
                            <ValueRow
                              key={"base" + i}
                              label={x.descricao ?? "Custo do cálculo"}
                              value={money(x.valor) + " / un."}
                            />
                          ))}
                          {d.personalizados?.map((x, i) => (
                            <ValueRow
                              key={"extra" + i}
                              label={
                                (x.descricao ?? "Gasto") +
                                (x.cancelado ? " · cancelado" : "")
                              }
                              value={money(x.valor)}
                            />
                          ))}
                        </>
                      )}
                      <Field
                        label="Descrição"
                        placeholder="Tinta, cola ou acabamento"
                        maxLength={150}
                        value={desc}
                        onChangeText={setDesc}
                      />
                      <Field
                        label="Valor total (R$)"
                        keyboardType="decimal-pad"
                        value={cost}
                        onChangeText={setCost}
                      />
                      <Button
                        label="Adicionar custo"
                        disabled={busy}
                        onPress={() => void act("custos")}
                      />

                      <Button
                        variant="secondary"
                        label={
                          loss
                            ? "Fechar perda de filamento"
                            : "Registrar perda de filamento"
                        }
                        onPress={() => setLoss(!loss)}
                      />
                      {loss && (
                        <>
                          <Picker
                            category="filamentos"
                            label="Filamento"
                            value={material}
                            onChange={setMaterial}
                          />
                          <Field
                            label="Material perdido (g)"
                            keyboardType="decimal-pad"
                            value={grams}
                            onChangeText={setGrams}
                          />
                          <Field
                            label="Unidades afetadas"
                            keyboardType="number-pad"
                            value={lossUnits}
                            onChangeText={setLossUnits}
                          />
                          <Field
                            label="Tempo perdido (min)"
                            keyboardType="number-pad"
                            value={minutes}
                            onChangeText={setMinutes}
                          />
                          <Field
                            label="Observação (opcional)"
                            maxLength={250}
                            value={note}
                            onChangeText={setNote}
                          />
                          <Button
                            label="Confirmar perda"
                            disabled={busy}
                            onPress={() => void act("perdas")}
                          />
                        </>
                      )}
                    </ScrollView>
                  </View>
                </KeyboardAvoidingView>
              </Modal>
            </>
          )
        )}
      </ModuleScreen>
      {d && !q.loading && !q.error && (!d.produzido || canSell || sold) && (
        <View style={footer}>
          <Button
            label={
              !d.produzido
                ? "Registrar produção"
                : sold
                  ? "Ver cálculo original"
                  : "Registrar venda"
            }
            variant={sold ? "secondary" : "primary"}
            busy={busy}
            disabled={busy}
            onPress={() =>
              sold ? original() : void act(d.produzido ? "venda" : "producao")
            }
          />
        </View>
      )}
    </View>
  );
}
