import { useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, View } from "react-native";
import { ModuleScreen } from "@/components/module-screen";
import { FormScrollView } from "@/components/form-scroll";
import { Body, Button, Card, Chip, Field, Heading, Notice, Pagination, layout } from "@/components/ui";
import { Icon } from "@/components/icon";
import { ListSearch } from "@/components/list-search";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import { operationKey } from "@/features/operation-key";
import { reais } from "@/features/format";
import { useTheme } from "@/theme/provider";

type Product = { id: string; nome: string; preco: number; custo?: number; arquivado: boolean };
type Sale = { id: string; nome: string; quantidade: number; ativas: number; canceladas: number; precoUnitario: number; custoUnitario?: number; receita: number; lucro?: number; nomeEmbalagem?: string; data: string };
type Page<T> = { itens: T[]; total: number; pagina: number; tamanho: number };
type Pack = { id: string; nome: string; custoUnitario: string };
const cash = (n?: number) => reais(n == null ? undefined : String(n));
const localDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
export default function OtherSales() {
  const t = useTheme();
  const [archived, setArchived] = useState(false), [salePage, setSalePage] = useState(0), [productPage, setProductPage] = useState(0);
  const [search, setSearch] = useState(""), [saleSearch, setSaleSearch] = useState("");
  const [form, setForm] = useState<{ kind: "product" | "sale"; product?: Product } | null>(null);
  const [name, setName] = useState(""), [price, setPrice] = useState(""), [cost, setCost] = useState(""), [units, setUnits] = useState("1"), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [saleDate, setSaleDate] = useState(localDate());
  const [salePrice, setSalePrice] = useState(""), [saleCost, setSaleCost] = useState("");
  const [packMode, setPackMode] = useState<"SEM" | "CADASTRADA" | "PERSONALIZADA">("SEM"), [packId, setPackId] = useState(""), [packCost, setPackCost] = useState(""), [packUnits, setPackUnits] = useState("1");
  const products = useApiQuery<Page<Product>>(`/outras-vendas/produtos?arquivados=${archived}&pagina=${productPage}`);
  const sales = useApiQuery<Page<Sale>>(`/outras-vendas/vendas?busca=${encodeURIComponent(saleSearch)}&pagina=${salePage}`);
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
      await request("/outras-vendas/vendas", { method: "POST", body: JSON.stringify({ produtoId: p.id, quantidade: Number(units), preco: salePrice ? Number(salePrice.replace(",", ".")) : null, custo: saleCost ? Number(saleCost.replace(",", ".")) : null, data: saleDate, tipoEmbalagem: packMode, embalagemId: packMode === "CADASTRADA" ? packId : null, valorEmbalagem: packMode === "PERSONALIZADA" && packCost ? Number(packCost.replace(",", ".")) : null, quantidadeEmbalagens: packMode === "SEM" ? 0 : Number(packUnits), chave: operationKey() }) });
      setForm(null); sales.retry();
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível registrar a venda."); }
    finally { setBusy(false); }
  }
  async function archive(p: Product) {
    try { await request(`/outras-vendas/produtos/${p.id}/estado?arquivado=${!p.arquivado}`, { method: "PUT" }); products.retry(); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o produto."); }
  }
  async function cancel(v: Sale) {
    Alert.alert("Cancelar venda", `Confirma o cancelamento das ${v.ativas} unidade(s) ainda ativas de ${v.nome}?`, [
      { text: "Voltar", style: "cancel" },
      { text: "Cancelar unidades", style: "destructive", onPress: () => {
        void request(`/outras-vendas/vendas/${v.id}/cancelamento`, { method: "POST", body: JSON.stringify({ quantidade: v.ativas }) }).then(() => sales.retry()).catch(e => setError(e instanceof Error ? e.message : "Não foi possível cancelar a venda."));
      } },
    ]);
  }
  const productItems = (products.data?.itens ?? []).filter(p => p.nome.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <ModuleScreen lightHeader section="Comercial" title="Outras vendas">
    <Heading title="Produtos da loja" subtitle="Registre vendas de itens que não são impressões 3D." />
    {!!error && <Notice message={error} />}
    <View style={{ ...layout.row, justifyContent: "space-between" }}><Body strong>Produtos cadastrados</Body><Button label="Novo produto" icon="bag-plus" onPress={() => { setName(""); setPrice(""); setCost(""); setError(""); setForm({ kind: "product" }); }} /></View>
    <View style={layout.row}><Chip label="Ativos" selected={!archived} onPress={() => { setArchived(false); setProductPage(0); }} /><Chip label="Arquivados" selected={archived} onPress={() => { setArchived(true); setProductPage(0); }} /></View>
    <ListSearch accessibilityLabel="Buscar produto" placeholder="Buscar produto" value={search} onChangeText={setSearch} />
    {products.loading ? <ActivityIndicator /> : products.error ? <Notice message={products.error} onRetry={products.retry} /> : productItems.map(p => <Card key={p.id}>
      <View style={{ ...layout.row, justifyContent: "space-between" }}><View style={{ flex: 1, gap: 3 }}><Body strong>{p.nome}</Body><Body muted>Venda {cash(p.preco)} · {p.custo == null ? "custo não informado" : `Custo ${cash(p.custo)}`}</Body></View><Icon name="bag-plus" color={t.primaryText} /></View>
      <View style={layout.row}><View style={{ flex: 1 }}><Button label="Registrar venda" onPress={() => { setUnits("1"); setSaleDate(localDate()); setSalePrice(""); setSaleCost(""); setPackMode("SEM"); setPackId(""); setPackCost(""); setPackUnits("1"); setError(""); setForm({ kind: "sale", product: p }); }} /></View><View style={{ flex: 1 }}><Button label="Editar" variant="secondary" onPress={() => { setName(p.nome); setPrice(String(p.preco)); setCost(p.custo == null ? "" : String(p.custo)); setError(""); setForm({ kind: "product", product: p }); }} /></View><Button label={archived ? "Reativar" : "Arquivar"} variant="ghost" onPress={() => void archive(p)} /></View>
    </Card>)}
    {!products.loading && !productItems.length && <Body muted>{search ? "Nenhum produto encontrado." : "Cadastre seu primeiro produto para registrar uma venda."}</Body>}
    {(products.data?.total ?? 0) > 20 && <Pagination page={productPage} total={products.data!.total} size={20} onPage={setProductPage} />}
    <Body strong>Vendas registradas</Body>
    <View style={{ ...layout.row }}><View style={{ flex: 1 }}><ListSearch accessibilityLabel="Buscar vendas registradas" placeholder="Buscar produto nas vendas" value={saleSearch} onChangeText={v => { setSaleSearch(v); setSalePage(0); }} /></View><Button label="Buscar" variant="secondary" onPress={sales.retry} /></View>
    <Body muted>Valores das unidades ativas, já descontando cancelamentos.</Body>
    {sales.loading ? <ActivityIndicator /> : sales.error ? <Notice message={sales.error} onRetry={sales.retry} /> : sales.data?.itens.map(v => <Card key={v.id}>
      <View style={{ ...layout.row, justifyContent: "space-between" }}><View style={{ flex: 1 }}><Body strong>{v.nome}</Body><Body muted>{new Date(v.data + "T12:00:00").toLocaleDateString("pt-BR")} · {v.ativas} de {v.quantidade} un. ativas</Body></View><Body strong>{cash(v.receita)}</Body></View>
      <View style={{ ...layout.row, backgroundColor: t.accentTint, padding: 10, borderRadius: 10, justifyContent: "space-between" }}><View><Body muted>Preço unitário</Body><Body strong>{cash(v.precoUnitario)}</Body></View><View><Body muted>Receita da venda</Body><Body strong>{cash(v.receita)}</Body></View><View><Body muted>Lucro da venda</Body><Body strong>{cash(v.lucro)}</Body></View></View>
      {!!v.nomeEmbalagem && <Body muted>Embalagem: {v.nomeEmbalagem}</Body>}
      {v.ativas > 0 && <Button label="Cancelar unidades ativas" variant="secondary" onPress={() => void cancel(v)} />}
    </Card>)}
    {(sales.data?.total ?? 0) > 20 && <Pagination page={salePage} total={sales.data!.total} size={20} onPage={setSalePage} />}
    <Modal visible={!!form} transparent animationType="slide" onRequestClose={() => setForm(null)}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#24183580" }}><Pressable onPress={() => setForm(null)} style={{ flex: 1 }} />
        <FormScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: "85%", backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20 }} contentContainerStyle={{ padding: 20, paddingBottom: 32, gap: 12 }}>
          <View style={{ ...layout.row, justifyContent: "space-between" }}><Body strong>{form?.kind === "sale" ? `Registrar venda · ${form.product?.nome ?? ""}` : form?.product ? "Editar produto" : "Cadastrar produto"}</Body><Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setForm(null)}><Icon name="chevron-right" color={t.primaryText} /></Pressable></View>
          {form?.kind === "product" ? <>
            <Body muted>O preço e o custo cadastrados serão usados nas próximas vendas.</Body>
            <Field label="Nome do produto" placeholder="Ex.: Luz de LED" value={name} onChangeText={setName} maxLength={150} />
            <Field label="Preço de venda por unidade (R$)" value={price} onChangeText={setPrice} keyboardType="decimal-pad" />
            <Field label="Custo gasto por produto (R$, opcional)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" />
            <Body muted>Sem custo informado, o lucro não poderá ser calculado.</Body>
            <Button label="Salvar produto" disabled={busy || name.trim().length < 2 || !price} onPress={() => void saveProduct()} />
          </> : <>
            <Body muted>Estas vendas não consomem filamento nem alteram a produção 3D.</Body>
            <Field label="Unidades vendidas" value={units} onChangeText={setUnits} keyboardType="number-pad" />
            <Field label="Data da venda" value={saleDate} onChangeText={setSaleDate} />
            <Body muted>Preço e custo em branco usam os valores cadastrados: {cash(form?.product?.preco)} · {cash(form?.product?.custo)}.</Body>
            <View style={{ ...layout.row }}><View style={{ flex: 1 }}><Field label="Preço por unidade (R$)" value={salePrice} onChangeText={setSalePrice} keyboardType="decimal-pad" /></View><View style={{ flex: 1 }}><Field label="Custo por unidade (R$)" value={saleCost} onChangeText={setSaleCost} keyboardType="decimal-pad" /></View></View>
            <Body strong>Embalagem (opcional)</Body>
            <View style={{ ...layout.row, flexWrap: "wrap" }}>{([["SEM", "Sem embalagem"], ["CADASTRADA", "Cadastrada"], ["PERSONALIZADA", "Personalizada"]] as const).map(([mode, label]) => <Chip key={mode} label={label} selected={packMode === mode} onPress={() => setPackMode(mode)} />)}</View>
            {packMode === "CADASTRADA" && (packs.loading ? <ActivityIndicator /> : <View style={{ gap: 6 }}>{packs.data?.itens.map(item => <Pressable key={item.id} onPress={() => setPackId(item.id)} style={{ padding: 10, borderWidth: 1, borderColor: packId === item.id ? t.primary : t.border, borderRadius: 10 }}><Body strong>{item.nome} · {cash(Number(item.custoUnitario))}</Body></Pressable>)}</View>)}
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
