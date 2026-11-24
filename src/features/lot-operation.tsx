import { useRef, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { operationKey } from "./operation-key";
import { Icon } from "@/components/icon";
import { useTheme } from "@/theme/provider";
import { request, ApiError } from "@/api/session";
import type { components } from "@/api/schema";
import { router } from "expo-router";
import { ModuleScreen, SiteButton } from "@/components/module-screen";
import {
  Badge,
  Body,
  Button,
  Card,
  Chip,
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
const tabs = ["Produção", "Vendas", "Custos"] as const;
type Tab = (typeof tabs)[number];
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
  const [tab, setTab] = useState<Tab>(),
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
  const d = q.data,
    active = tab ?? (d?.produzido ? "Vendas" : "Produção");
  async function act(action: "producao" | "venda" | "custos" | "perdas") {
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
  return (
    <ModuleScreen
      lightHeader
      section="Vendas e estoque"
      title="Operação do lote"
      onBack={onBack}
    >
      {!!message && <Badge>{message}</Badge>}
      {!!error && <Notice message={error} />}
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        d && (
          <>
            <Card>
              <CalculationIdentity id={id} name={d.nome} />
              <Body muted>
                {d.impressora} · {d.unidades} un. no lote
              </Body>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {[
                  [d.produzido ? "Produzidas" : "A produzir", d.unidades],
                  ["Disponíveis", d.disponiveis],
                  ["Vendidas", d.vendidas],
                ].map(([label, value]) => (
                  <View
                    key={label}
                    style={{
                      flexGrow: 1,
                      flexBasis: 75,
                      padding: 10,
                      borderRadius: 8,
                      backgroundColor: t.accentTint,
                    }}
                  >
                    <Body muted>{label}</Body>
                    <Body strong>{value} un.</Body>
                  </View>
                ))}
              </View>
              {!!d.reservadas && (
                <Body>{d.reservadas} un. reservadas para pedidos</Body>
              )}
              <Button
                variant="ghost"
                label="Ver cálculo original"
                onPress={() =>
                  router.push({
                    pathname: "/calculate",
                    params: { modo: "detalhe", id },
                  })
                }
              />
              {!!d.reservadas && (
                <SiteButton
                  site="/orcamentos"
                  label="Gerenciar reservas nos pedidos"
                />
              )}
            </Card>
            <View style={layout.row}>
              {tabs.map((x) => (
                <Chip
                  key={x}
                  label={x}
                  selected={x === active}
                  onPress={() => {
                    setTab(x);
                    setMessage("");
                    setError("");
                  }}
                />
              ))}
            </View>
            {active === "Produção" && (
              <Card>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Icon name="calculator" color={t.primaryText} />
                  <Body strong>Produção do lote</Body>
                </View>
                <View
                  style={{
                    padding: 14,
                    gap: 4,
                    backgroundColor: t.accentTint,
                    borderRadius: 10,
                  }}
                >
                  <Body muted>Custo previsto no lote</Body>
                  <Body strong>{money(d.custoLote)}</Body>
                  <Body muted>Por unidade · {money(d.custoUnitario)}</Body>
                </View>
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
                      <Body strong>
                        {decimal(String(m.gramas ?? 0))} g no lote
                      </Body>
                      <Body muted>{money(m.custo)} de filamento</Body>
                    </View>
                  </View>
                ))}
                {!d.produzido && (
                  <Button
                    label="Registrar produção do lote"
                    busy={busy}
                    disabled={busy}
                    onPress={() => void act("producao")}
                  />
                )}
              </Card>
            )}
            {active === "Vendas" && (
              <>
                <Card>
                  <Body strong>Registrar venda</Body>
                  {(d.disponiveis ?? 0) > 0 ? (
                    <>
                      <Field
                        label="Unidades para vender"
                        keyboardType="number-pad"
                        value={units}
                        onChangeText={setUnits}
                      />
                      <Button
                        variant="ghost"
                        label={
                          advanced
                            ? "Ocultar valores da venda"
                            : "Ajustar preço, desconto e taxas"
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
                      <Button
                        label="Registrar venda"
                        disabled={busy}
                        busy={busy}
                        onPress={() => void act("venda")}
                      />
                    </>
                  ) : (
                    <Body muted>
                      {d.produzido
                        ? "Nenhuma unidade livre para venda."
                        : "Registre a produção para liberar a venda."}
                    </Body>
                  )}
                </Card>
                <Card>
                  <Body strong>Vendas do lote</Body>
                  <ValueRow
                    label="Lucro previsto nas unidades vendidas"
                    value={money(d.lucroPrevisto)}
                  />
                  <ValueRow
                    label="Lucro com os valores da venda"
                    value={money(d.lucroVendas)}
                  />
                  {(d.totalExtras ?? 0) > 0 && (
                    <Body muted>
                      Custos personalizados e perdas de filamento são divididos pelas
                      unidades do lote e descontados ao registrar a venda.
                    </Body>
                  )}
                  {d.vendas?.length ? (
                    d.vendas.map((v, i) => (
                      <View key={i}>
                        <Body>
                          {v.unidades} un. ativas · {v.canceladas} canceladas
                        </Body>
                        <Body muted>
                          {v.data?.slice(0, 10).split("-").reverse().join("/")}{" "}
                          · Preço/un. {money(v.preco ?? d.preco)}
                        </Body>
                      </View>
                    ))
                  ) : (
                    <Body muted>Nenhuma venda registrada.</Body>
                  )}
                </Card>
              </>
            )}
            {active === "Custos" && (
              <>
                <Card>
                  <Body strong>Custos extras incluídos no cálculo</Body>
                  {d.incluidos?.length ? (
                    d.incluidos.map((x, i) => (
                      <ValueRow
                        key={i}
                        label={x.descricao ?? "Custo"}
                        value={money(x.valor) + " / un."}
                      />
                    ))
                  ) : (
                    <Body muted>Nenhum custo extra incluído.</Body>
                  )}
                </Card>
                <Card>
                  <ValueRow
                    label="Custos personalizados do lote"
                    value={money(d.totalExtras)}
                  />
                  {d.personalizados?.map((x, i) => (
                    <ValueRow
                      key={i}
                      label={
                        (x.descricao ?? "Gasto") +
                        (x.cancelado ? " · cancelado" : "")
                      }
                      value={money(x.valor)}
                    />
                  ))}
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
                </Card>
                <Card>
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
                </Card>
              </>
            )}
            <SiteButton
              label="Mais operações do lote no site"
              site={"/vendas-estoque/lote/" + id}
            />
          </>
        )
      )}
    </ModuleScreen>
  );
}
