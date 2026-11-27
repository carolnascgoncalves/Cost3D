import { useRef, useState } from "react";
import { ActivityIndicator, Modal, Pressable, Text, View } from "react-native";
import { ModuleScreen } from "@/components/module-screen";
import { FormScrollView } from "@/components/form-scroll";
import { Icon } from "@/components/icon";
import { Body, Button, Card, Chip, Field, Notice, Pagination, layout } from "@/components/ui";
import { ListSearch } from "@/components/list-search";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import { operationKey } from "@/features/operation-key";
import { reais } from "@/features/format";
import { useTheme } from "@/theme/provider";

type Product = { id: string; nome: string; preco: number; custo?: number; arquivado: boolean };
type Sale = { id: string; nome: string; quantidade: number; ativas: number; canceladas: number; precoUnitario: number; custoUnitario?: number; receita: number; lucro?: number; nomeEmbalagem?: string; data: string };
type Page<T> = { itens: T[]; total: number; pagina: number; tamanho: number };
type Pack = { id: string; nome: string; custo: string };
const cash = (n?: number) => reais(n == null ? undefined : String(n));
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export default function OtherSales() {
  const t = useTheme();
  const [archived, setArchived] = useState(false), [salePage, setSalePage] = useState(0), [productPage, setProductPage] = useState(0);
  const [tab, setTab] = useState<"products" | "sales">("products");
  const [search, setSearch] = useState(""), [saleSearch, setSaleSearch] = useState("");
  const [form, setForm] = useState<{ kind: "product" | "sale"; product?: Product } | null>(null);
  const [actionsProduct, setActionsProduct] = useState<Product | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Sale | null>(null);
  const [name, setName] = useState(""), [price, setPrice] = useState(""), [cost, setCost] = useState(""), [units, setUnits] = useState("1"), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [saleDate, setSaleDate] = useState(localDate());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [salePrice, setSalePrice] = useState(""), [saleCost, setSaleCost] = useState("");
  const [packMode, setPackMode] = useState<"SEM" | "CADASTRADA" | "PERSONALIZADA">("SEM"), [packId, setPackId] = useState(""), [packCost, setPackCost] = useState(""), [packUnits, setPackUnits] = useState("1");
  const saleAttempt = useRef({ signature: "", key: "" });
  const products = useApiQuery<Page<Product>>(`/outras-vendas/produtos?arquivados=${archived}&pagina=${productPage}&busca=${encodeURIComponent(search)}`);
  const sales = useApiQuery<Page<Sale>>(`/outras-vendas/vendas?busca=${encodeURIComponent(saleSearch)}&pagina=${salePage}`);
  const summary = useApiQuery<{ receita: number; lucro: number; unidades: number; semCusto: number }>(`/outras-vendas/vendas/resumo?busca=${encodeURIComponent(saleSearch)}`);
  const packs = useApiQuery<{ itens: Pack[]; total: number }>(form?.kind === "sale" ? "/catalogo/embalagens" : null);
  async function saveProduct() {
    setBusy(true); setError("");
    try {
      await request("/outras-vendas/produtos", { method: "POST", body: JSON.stringify({ id: form?.product?.id, nome: name.trim(), preco: Number(price.replace(",", ".")), custo: cost ? Number(cost.replace(",", ".")) : null }) });
      setForm(null); products.retry();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o produto."); }
    finally { setBusy(false); }
  }
  async function registerSale() {
    const p = form?.product; if (!p) return;
    setBusy(true); setError("");
    try {
      const input = { produtoId: p.id, quantidade: Number(units), preco: salePrice ? Number(salePrice.replace(",", ".")) : null, custo: saleCost ? Number(saleCost.replace(",", ".")) : null, data: saleDate, tipoEmbalagem: packMode, embalagemId: packMode === "CADASTRADA" ? packId : null, valorEmbalagem: packMode === "PERSONALIZADA" && packCost ? Number(packCost.replace(",", ".")) : null, quantidadeEmbalagens: packMode === "SEM" ? 0 : Number(packUnits) };
      const signature = JSON.stringify(input);
      if (saleAttempt.current.signature !== signature) saleAttempt.current = { signature, key: operationKey() };
      await request("/outras-vendas/vendas", { method: "POST", body: JSON.stringify({ ...input, chave: saleAttempt.current.key }) });
      saleAttempt.current = { signature: "", key: "" };
      setForm(null); sales.retry();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registrar a venda."); }
    finally { setBusy(false); }
  }
  async function archive(p: Product) {
    try { await request(`/outras-vendas/produtos/${p.id}/estado?arquivado=${!p.arquivado}`, { method: "PUT" }); products.retry(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o produto."); }
  }
  async function cancel(v: Sale) {
    setBusy(true); setError("");
    try {
      await request(`/outras-vendas/vendas/${v.id}/cancelamento`, { method: "POST", body: JSON.stringify({ quantidade: v.ativas }) });
      setCancelTarget(null); sales.retry(); summary.retry();
    } catch (e) { setCancelTarget(null); setError(e instanceof Error ? e.message : "Não foi possível cancelar a venda."); }
    finally { setBusy(false); }
  }
  const productItems = products.data?.itens ?? [];
  return <ModuleScreen lightHeader section="Comercial" title="Outras vendas">
    <Body muted>Itens que não são impressões 3D.</Body>
    {!!error && <Notice message={error} />}
    <View style={{ flexDirection: "row", padding: 4, borderRadius: 13, backgroundColor: t.accentTint, gap: 4 }}>
      {([["products", `Produtos ${products.data?.total ?? ""}`], ["sales", `Vendas ${sales.data?.total ?? ""}`]] as const).map(([key, label]) => <Pressable key={key} accessibilityRole="button" accessibilityState={{ selected: tab === key }} onPress={() => setTab(key)} style={{ flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 10, backgroundColor: tab === key ? t.surface : "transparent", borderWidth: tab === key ? 1 : 0, borderColor: t.border }}><Text style={{ color: tab === key ? t.primaryText : t.muted, fontWeight: tab === key ? "700" : "500" }}>{label}</Text></Pressable>)}
    </View>
    {tab === "products" ? <View style={{ gap: 12 }}>
      <View style={layout.row}><View style={{ flex: 1 }}><ListSearch accessibilityLabel="Buscar produto" placeholder="Buscar produto" value={search} onChangeText={value => { setSearch(value); setProductPage(0); }} /></View><Button label="+ Novo" onPress={() => { setName(""); setPrice(""); setCost(""); setError(""); setForm({ kind: "product" }); }} /></View>
      <View style={{ flexDirection: "row", gap: 20, borderBottomWidth: 1, borderColor: t.border }}>
        {[[false, "Ativos"], [true, "Arquivados"]].map(([value, label]) => <Pressable key={String(label)} accessibilityRole="button" accessibilityState={{ selected: archived === value }} onPress={() => { setArchived(Boolean(value)); setProductPage(0); }} style={{ paddingVertical: 8, borderBottomWidth: 2, borderColor: archived === value ? t.primary : "transparent" }}><Text style={{ color: archived === value ? t.primaryText : t.muted, fontWeight: archived === value ? "700" : "500" }}>{label}</Text></Pressable>)}
      </View>
      {products.loading ? <ActivityIndicator /> : products.error ? <Notice message={products.error} onRetry={products.retry} /> : productItems.map(p => {
        const margin = p.custo == null || !p.preco ? undefined : Math.round(((p.preco - p.custo) / p.preco) * 100);
        const edit = () => { setName(p.nome); setPrice(String(p.preco)); setCost(p.custo == null ? "" : String(p.custo)); setError(""); setForm({ kind: "product", product: p }); };
        return <Card key={p.id}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8 }}><View style={{ flex: 1, gap: 3 }}><Body strong>{p.nome}</Body><Body muted>Venda {cash(p.preco)} · {p.custo == null ? "Sem custo" : `Custo ${cash(p.custo)}`}</Body></View><Pressable accessibilityRole="button" accessibilityLabel={`Ações de ${p.nome}`} onPress={() => setActionsProduct(p)} hitSlop={8}><Text style={{ color: t.muted, fontSize: 23, lineHeight: 24 }}>⋮</Text></Pressable></View>
          <Text style={{ alignSelf: "flex-start", borderRadius: 8, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 4, color: margin == null ? t.muted : margin < 0 ? t.danger : t.success, backgroundColor: margin == null ? t.accentTint : margin < 0 ? t.dangerBackground : t.success + "14", fontSize: 12 }}>{margin == null ? "Informe o custo para ver o lucro" : `Margem ${margin}%`}</Text>
          {!archived && <Button stretch label="Registrar venda" variant="secondary" onPress={() => { const today = localDate(); setUnits("1"); setSaleDate(today); setCalendarMonth(new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1, 1)); setCalendarOpen(false); setSalePrice(String(p.preco)); setSaleCost(p.custo == null ? "" : String(p.custo)); setPackMode("SEM"); setPackId(""); setPackCost(""); setPackUnits("1"); setError(""); setForm({ kind: "sale", product: p }); }} />}
        </Card>;
      })}
      {!products.loading && !productItems.length && <Body muted>{search ? "Nenhum produto encontrado." : "Cadastre seu primeiro produto para registrar uma venda."}</Body>}
      {(products.data?.total ?? 0) > 20 && <Pagination page={productPage} total={products.data!.total} size={20} onPage={setProductPage} />}
    </View> : <View style={{ gap: 12 }}>
      <View style={layout.row}>
        <Card style={{ flex: 1, gap: 2, backgroundColor: t.accentTint }}><Body muted>Receita</Body><Text style={{ color: t.text, fontSize: 18, fontWeight: "700" }}>{cash(summary.data?.receita)}</Text></Card>
        <Card style={{ flex: 1, gap: 2, backgroundColor: t.surface }}><Body muted>Lucro</Body><Text style={{ color: t.success, fontSize: 18, fontWeight: "700" }}>{cash(summary.data?.lucro)}</Text></Card>
      </View>
      {Boolean(summary.data?.semCusto) && <Body muted>Vendas sem custo cadastrado ficam fora do lucro calculado.</Body>}
      <ListSearch accessibilityLabel="Buscar vendas registradas" placeholder="Buscar produto nas vendas" value={saleSearch} onChangeText={v => { setSaleSearch(v); setSalePage(0); }} />
      {sales.loading ? <ActivityIndicator /> : sales.error ? <Notice message={sales.error} onRetry={sales.retry} /> : sales.data?.itens.map(v => v.ativas > 0 ? <Card key={v.id}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}><View style={{ flex: 1 }}><Body strong>{v.nome}</Body><Body muted>{new Date(v.data + "T12:00:00").toLocaleDateString("pt-BR")} · {v.quantidade} {v.quantidade === 1 ? "unidade" : "unidades"}</Body></View><Body strong>{cash(v.receita)}</Body></View>
        <View style={{ flexDirection: "row", gap: 24 }}><View><Body muted>Unitário</Body><Body strong>{cash(v.precoUnitario)}</Body></View><View><Body muted>Lucro</Body><Text style={{ color: v.lucro == null ? t.muted : v.lucro < 0 ? t.danger : t.success, fontWeight: "700" }}>{cash(v.lucro)}</Text></View></View>
        <Body muted>{v.nomeEmbalagem || "Sem embalagem"}</Body>
        {v.ativas > 0 ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => setCancelTarget(v)} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 8, opacity: busy ? 0.5 : 1 }}><Text style={{ color: t.danger, fontWeight: "600" }}>Cancelar venda</Text></Pressable> : <Body muted>Cancelada</Body>}
      </Card> : <Card key={v.id} style={{ opacity: 0.62, paddingVertical: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <View style={{ flex: 1 }}><Body strong>{v.nome}</Body><Body muted>{new Date(v.data + "T12:00:00").toLocaleDateString("pt-BR")} · {v.quantidade} {v.quantidade === 1 ? "unidade" : "unidades"}</Body></View>
          <Text style={{ color: t.muted, backgroundColor: t.accentTint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 }}>Cancelada</Text>
        </View>
      </Card>)}
      {(sales.data?.total ?? 0) > 20 && <Pagination page={salePage} total={sales.data!.total} size={20} onPage={setSalePage} />}
    </View>}
    <Modal visible={!!cancelTarget} transparent animationType="fade" onRequestClose={() => setCancelTarget(null)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#24183580" }}><Pressable onPress={() => setCancelTarget(null)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
        <Card><Body strong>Cancelar venda</Body><Body muted>Confirma o cancelamento das {cancelTarget?.ativas ?? 0} unidade(s) ativas de {cancelTarget?.nome}?</Body><Button stretch label="Manter venda" variant="secondary" disabled={busy} onPress={() => setCancelTarget(null)} /><Button stretch label="Cancelar unidades" variant="danger" busy={busy} onPress={() => cancelTarget && void cancel(cancelTarget)} /></Card>
      </View>
    </Modal>
    <Modal visible={!!actionsProduct} transparent animationType="fade" onRequestClose={() => setActionsProduct(null)}>
      <View style={{ flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#24183580" }}><Pressable onPress={() => setActionsProduct(null)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
        <Card><Body strong>{actionsProduct?.nome}</Body><Button stretch label="Editar" variant="secondary" onPress={() => { const p = actionsProduct; setActionsProduct(null); if (p) { setName(p.nome); setPrice(String(p.preco)); setCost(p.custo == null ? "" : String(p.custo)); setError(""); setForm({ kind: "product", product: p }); } }} /><Button stretch label={archived ? "Reativar produto" : "Arquivar produto"} variant="secondary" onPress={() => { const p = actionsProduct; setActionsProduct(null); if (p) void archive(p); }} /><Button stretch label="Fechar" variant="ghost" onPress={() => setActionsProduct(null)} /></Card>
      </View>
    </Modal>
    <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#24183580" }}><Pressable onPress={() => setForm(null)} style={{ flex: 1 }} />
        <FormScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "85%", backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 12 }}>
          <View style={{ ...layout.row, justifyContent: "space-between" }}><Body strong>{form?.kind === "sale" ? `Registrar venda · ${form.product?.nome ?? ""}` : form?.product ? "Editar produto" : "Novo produto"}</Body><Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setForm(null)}><Text style={{ color: t.primaryText, fontSize: 24 }}>×</Text></Pressable></View>
          {form?.kind === "product" ? <>
            <Body muted>O preço e o custo cadastrados serão usados nas próximas vendas.</Body>
            <Field label="Nome do produto" placeholder="Ex.: Luz de LED" value={name} onChangeText={setName} maxLength={150} />
            <Field label="Preço de venda por unidade (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <Field label="Custo por unidade (R$)" optional value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
            <View style={{ padding: 12, borderRadius: 10, backgroundColor: t.accentTint }}><Body muted>Informe o custo para ver o lucro.</Body></View>
            <Button label="Salvar produto" disabled={busy || name.trim().length < 2 || !price} onPress={() => void saveProduct()} />
          </> : <>
            <Body muted>Estas vendas não consomem filamento nem alteram a produção 3D.</Body>
            <Field label="Unidades vendidas" value={units} onChangeText={setUnits} keyboardType="number-pad" />
            <Body>Data da venda</Body>
            <Pressable accessibilityRole="button" accessibilityLabel="Escolher data da venda" accessibilityState={{ expanded: calendarOpen }} onPress={() => setCalendarOpen(!calendarOpen)} style={{ minHeight: 44, borderWidth: 1, borderColor: t.border, borderRadius: 12, paddingHorizontal: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}><Text style={{ color: t.text }}>{new Date(saleDate + "T12:00:00").toLocaleDateString("pt-BR")}</Text><Icon name="calendar3" size={17} color={t.primaryText} /></Pressable>
            {calendarOpen && <View style={{ borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 10, gap: 10 }}>
              <View style={{ ...layout.row, justifyContent: "space-between", alignItems: "center" }}><Pressable accessibilityLabel="Mês anterior" onPress={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><Text style={{ padding: 8, color: t.primaryText }}>‹</Text></Pressable><Body strong>{calendarMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}</Body><Pressable accessibilityLabel="Próximo mês" disabled={calendarMonth.getFullYear() === new Date().getFullYear() && calendarMonth.getMonth() >= new Date().getMonth()} onPress={() => setCalendarMonth(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><Text style={{ padding: 8, color: t.primaryText }}>›</Text></Pressable></View>
              <View style={{ flexDirection: "row" }}>{["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => <View key={i} style={{ flex: 1, alignItems: "center" }}><Body muted>{d}</Body></View>)}</View>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>{Array.from({ length: 42 }, (_, i) => { const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1); const day = new Date(first.getFullYear(), first.getMonth(), i - first.getDay() + 1); const currentMonth = day.getMonth() === calendarMonth.getMonth(); const value = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`; const selected = value === saleDate; const future = value > localDate(); return <Pressable key={value} disabled={!currentMonth || future} accessibilityRole="button" accessibilityLabel={day.toLocaleDateString("pt-BR")} accessibilityState={{ selected, disabled: !currentMonth || future }} onPress={() => { setSaleDate(value); setCalendarOpen(false); }} style={{ width: "14.285%", height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18, backgroundColor: selected ? t.primary : "transparent", opacity: currentMonth && !future ? 1 : 0.3 }}><Text style={{ color: selected ? t.onPrimary : t.text, fontSize: 13 }}>{day.getDate()}</Text></Pressable>; })}</View>
            </View>}
            <Body muted>Preço e custo já começam com os valores cadastrados; você pode alterar cada valor para esta venda.</Body>
            <View style={{ ...layout.row }}><View style={{ flex: 1 }}><Field label="Preço por unidade (R$)" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Custo por unidade (R$)" optional value={saleCost} onChangeText={setSaleCost} keyboardType="decimal-pad" /></View></View>
            <Body strong>Embalagem (opcional)</Body>
            <View style={{ ...layout.row, flexWrap: "wrap" }}>{([["SEM", "Sem embalagem"], ["CADASTRADA", "Cadastrada"], ["PERSONALIZADA", "Personalizada"]] as const).map(([mode, label]) => <Chip key={mode} label={label} selected={packMode === mode} onPress={() => setPackMode(mode)} />)}</View>
            {packMode === "CADASTRADA" && (packs.loading ? <ActivityIndicator /> : <View style={{ gap: 6 }}>{packs.data?.itens.map(item => <Pressable key={item.id} onPress={() => setPackId(item.id)} style={{ padding: 10, borderWidth: 1, borderColor: packId === item.id ? t.primary : t.border, borderRadius: 10, backgroundColor: packId === item.id ? t.accentTint : t.surface }}><Body strong>{item.nome} · {cash(Number(item.custo))}</Body></Pressable>)}</View>)}
            {packMode === "PERSONALIZADA" && <Field label="Custo de uma embalagem (R$)" value={packCost} onChangeText={setPackCost} keyboardType="decimal-pad" />}
            {packMode !== "SEM" && <Field label="Quantidade de embalagens nesta venda" value={packUnits} onChangeText={setPackUnits} keyboardType="number-pad" />}
            {packMode !== "SEM" && <Body muted>O custo considera a quantidade de embalagens usada e é ajustado proporcionalmente em cancelamentos parciais.</Body>}
            <Button label="Registrar venda" disabled={busy || Number(units) < 1 || (packMode === "CADASTRADA" && !packId) || (packMode === "PERSONALIZADA" && !packCost)} onPress={() => void registerSale()} />
          </>}
        </FormScrollView>
            </View>
    </Modal>
  </ModuleScreen>;
}
