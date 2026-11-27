import { SearchEmpty } from "@/components/ui";
import { ListSearch } from "@/components/list-search";
import { CatalogEditor } from "@/features/catalog-editor";
import { pieceCalculation } from "@/features/calculation-route";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ModuleScreen, MenuRows } from "@/components/module-screen";
import {
  Body,
  Button,
  Card,
  Chip,
  Notice,
  Pagination,
  layout,
} from "@/components/ui";
import { CatalogDetail } from "@/components/catalog-detail";
import { Icon } from "@/components/icon";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import { useTheme } from "@/theme/provider";
import { clearCachedApiQuery } from "@/hooks/use-cached-api-query";
import { decimal, quantity, reais } from "@/features/format";
import {
  CatalogCard,
  stockLevel,
  type CatalogRow as Row,
} from "@/components/catalog-card";

const categories = [
  { label: "Peças", key: "pecas", create: "Nova peça" },
  {
    label: "Filamentos",
    key: "filamentos",
    create: "Novo filamento",
  },
  {
    label: "Impressoras",
    key: "impressoras",
    create: "Nova impressora",
  },
  {
    label: "Embalagens",
    key: "embalagens",
    create: "Nova embalagem",
  },
] as const;
type Category = (typeof categories)[number];

export default function Catalog() {
  const { categoria } = useLocalSearchParams<{ categoria?: string }>();
  const category = categories.find((c) => c.key === categoria) ?? categories[0];
  return <Listings key={category.key} category={category} />;
}

function Listings({ category }: { category: Category }) {
  const mobile = useWindowDimensions().width < 900;
  const t = useTheme();
  const [editor, setEditor] = useState<{ id?: string; purchase: boolean }>();
  const [created, setCreated] = useState(false);
  const [piece, setPiece] = useState<Row>();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [lowOnly, setLowOnly] = useState(false);
  const [selecting, setSelecting] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);
  function toggle(id: string) {
    setResult("");
    setSelected((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id],
    );
  }
  function cancelSelection() {
    setSelecting(false);
    setSelected([]);
    setConfirm(false);
    setResult("");
  }
  async function remove() {
    if (lock.current || !selected.length) return;
    lock.current = true;
    setBusy(true);
    try {
      const blocked = await request<string[]>(
        "/catalogo/" + category.key + "/remover-lote",
        { method: "POST", body: JSON.stringify({ ids: selected }) },
      );
      setSelected(blocked);
      setSelecting(!!blocked.length);
      setPage(0);
      q.retry();
      setResult(
        blocked.length
          ? blocked.length +
              " em uso. Os cadastros vinculados foram preservados."
          : "Exclusão concluída.",
      );
    } catch (e) {
      setResult(e instanceof Error ? e.message : "Não foi possível apagar.");
    } finally {
      setConfirm(false);
      lock.current = false;
      setBusy(false);
    }
  }
  const singular =
    category.key === "pecas"
      ? "peça"
      : category.key === "filamentos"
        ? "filamento"
        : category.key === "impressoras"
          ? "impressora"
          : "embalagem";
  const q = useApiQuery<{ itens?: Row[]; total?: number; tamanho?: number }>(
    "/catalogo/" +
      category.key +
      "?pagina=" +
      page +
      "&busca=" +
      encodeURIComponent(debouncedSearch),
  );
  const items = q.data?.itens ?? [];
  const lowStock =
    mobile && category.key === "filamentos"
      ? items.filter((row) => stockLevel(row)?.low)
      : [];
  const visible =
    mobile && category.key === "filamentos" && lowOnly ? lowStock : items;
  function edit(row: Row, purchase = false) {
    if (row.id) setEditor({ id: row.id, purchase });
  }
  if (editor)
    return (
      <CatalogEditor
        category={category.key}
        {...editor}
        onBack={() => setEditor(undefined)}
        onSaved={() => {
          if (!editor.id) {
            setPage(0);
            setCreated(true);
          }
          setEditor(undefined);
          setPiece(undefined);
          if (category.key === "pecas" && editor.id) clearCachedApiQuery(`/catalogo/pecas/${encodeURIComponent(editor.id)}/placas/`);
          q.retry();
        }}
      />
    );
  if (piece)
    return (
      <CatalogDetail
        onEdit={(purchase) => edit(piece, purchase)}
        category={category.key}
        row={items.find((item) => item.id === piece.id) ?? piece}
        onBack={() => setPiece(undefined)}
      />
    );
  return (
    <ModuleScreen section="Seu catálogo" title={category.label}>
      {!selecting && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18, borderBottomWidth: 1, borderColor: t.border }}>
          {categories.map((c) => (
            <Pressable key={c.key} accessibilityRole="tab" accessibilityState={{ selected: category === c }} onPress={() => router.setParams({ categoria: c.key })} style={{ minHeight: 36, justifyContent: "center", borderBottomWidth: 2, borderColor: category === c ? t.primary : "transparent" }}>
              <Text style={{ color: category === c ? t.text : t.muted, fontSize: 14, fontWeight: category === c ? "700" : "500" }}>{c.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {selecting ? (
          <>
            <Button
              variant="secondary"
              label="Cancelar"
              onPress={cancelSelection}
            />
            <View style={{ flex: 1 }}>
              <Body strong>{selected.length} na seleção</Body>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Selecionar cadastros para apagar"
              hitSlop={8}
              onPress={() => setSelecting(true)}
              style={{ width: 34, height: 40, alignItems: "center", justifyContent: "center" }}
            >
              <Icon name="three-dots" size={17} color={t.muted} />
            </Pressable>
            <Button
              variant="danger"
              label="Apagar"
              disabled={!selected.length || busy}
              onPress={() => setConfirm(true)}
            />
          </>
        ) : (
          <>
            <View style={{ flex: 1 }}>
              <ListSearch
                accessibilityLabel={"Buscar em " + category.label}
                placeholder={"Buscar " + category.label.toLowerCase().replace(/s$/, "")}
                value={search}
                style={{ minHeight: 40, borderRadius: 10, paddingVertical: 7 }}
                onChangeText={(value) => { setSearch(value); setPage(0); }}
              />
            </View>
            <Button
              compact
              label="Nova"
              iconNode={<Text style={{ color: t.onPrimary, fontSize: 18, lineHeight: 20, fontWeight: "400" }}>+</Text>}
              onPress={() => { setCreated(false); setResult(""); setEditor({ purchase: false }); }}
            />
          </>
        )}
      </View>
      {!!result && <Body>{result}</Body>}
      <Modal
        visible={confirm}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            backgroundColor: "#24183580",
          }}
        >
          <View style={{ width: "100%", maxWidth: 400 }}>
            <Card>
              <Body strong>
                Apagar {selected.length}{" "}
                {selected.length === 1
                  ? singular
                  : category.label.toLowerCase()}
                ?
              </Body>
              <Body muted>
                Esta ação não pode ser desfeita. Cadastros em uso serão
                preservados.
              </Body>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Button
                    label="Cancelar"
                    variant="secondary"
                    disabled={busy}
                    onPress={() => setConfirm(false)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    variant="danger"
                    label="Apagar"
                    busy={busy}
                    disabled={busy}
                    onPress={() => void remove()}
                  />
                </View>
              </View>
            </Card>
          </View>
        </View>
      </Modal>
      {created && <Body>Cadastro salvo.</Body>}
      {q.loading ? (
        <ActivityIndicator color={t.primaryText} />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          {mobile && category.key === "filamentos" && (
            <View style={layout.row}>
              <Chip
                secondary
                icon="disc"
                label={"Acabando (" + lowStock.length + ")"}
                selected={lowOnly}
                onPress={() => setLowOnly(!lowOnly)}
              />
              <Body muted>
                {lowOnly
                  ? "Estoque baixo nesta página"
                  : "Todos os filamentos desta página"}
              </Body>
            </View>
          )}
          {!visible.length && (
            <Card>
              <SearchEmpty
                message={
                  lowOnly
                    ? "Nenhum filamento acabando nesta página."
                    : search
                      ? "Nenhum cadastro encontrado."
                      : "Nenhum cadastro nesta categoria."
                }
              />
            </Card>
          )}
          {category.key === "embalagens" && !selecting && visible.length ? (
            <Card style={{ paddingVertical: 0, gap: 0 }}>
              {visible.map((row, index) => (
                <Pressable key={row.id} accessibilityRole="button" accessibilityLabel={`Ver detalhes de ${row.nome}`} onPress={() => setPiece(row)} style={{ minHeight: 64, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: index === visible.length - 1 ? 0 : 1, borderColor: t.border }}>
                  <View style={{ width: 40, height: 40, borderRadius: 11, backgroundColor: t.accentTint, alignItems: "center", justifyContent: "center" }}><Icon name="box" size={19} color={t.primaryText} /></View>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Body strong>{row.nome}</Body><Body muted>{row.usos ? `Usada em ${row.usos} cálculos` : "Ainda não usada"}</Body></View>
                  <View style={{ alignItems: "flex-end", gap: 1 }}><Body strong>{reais(row.custo)}</Body><Text style={{ color: t.muted, fontSize: 11 }}>por unidade</Text></View>
                  <Icon name="chevron-right" size={15} color={t.muted} />
                </Pressable>
              ))}
            </Card>
          ) : visible.map((row) =>
            selecting ? (
              <Pressable
                key={row.id}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected.includes(row.id!) }}
                accessibilityLabel={row.nome}
                disabled={!row.id}
                onPress={() => toggle(row.id!)}
              >
                <Card
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                    backgroundColor: selected.includes(row.id!)
                      ? t.accentTint
                      : t.surface,
                  }}
                >
                  <Text style={{ fontSize: 23, color: t.primaryText }}>
                    {selected.includes(row.id!) ? "☑" : "☐"}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Body strong>{row.nome}</Body>
                    {!!(row.cor || row.categoria || row.modelo) && (
                      <Body muted>
                        {row.cor || row.categoria || row.modelo}
                      </Body>
                    )}
                  </View>
                </Card>
              </Pressable>
            ) : mobile ? (
              <CatalogCard
                onEdit={(purchase) => edit(row, purchase)}
                key={row.id}
                category={category.key}
                row={row}
                onDetails={() => setPiece(row)}
              />
            ) : (
              <Card key={row.id}>
                <Button
                  label="Editar"
                  variant="ghost"
                  onPress={() => edit(row)}
                />
                {category.key === "filamentos" && (
                  <Button
                    label="Registrar compra"
                    variant="secondary"
                    onPress={() => edit(row, true)}
                  />
                )}
                <View style={layout.row}>
                  <Text
                    style={{
                      color: t.text,
                      fontSize: 17,
                      fontWeight: "700",
                      flex: 1,
                    }}
                  >
                    {row.nome}
                  </Text>
                  {!!row.categoria && <Body muted>{row.categoria}</Body>}
                </View>
                {category.key === "pecas" && (
                  <>
                    <Body muted>
                      {quantity(row.gramas, "g")} · {row.minutos} min de
                      impressão
                    </Body>
                    <Body>Último preço · {reais(row.preco)}</Body>
                    {row.id && (
                      <MenuRows
                        entries={[
                          {
                            label: "Calcular",
                            route: pieceCalculation(row),
                          },
                        ]}
                      />
                    )}
                  </>
                )}
                {category.key === "filamentos" && (
                  <Body muted>
                    {row.cor} · {quantity(row.estoque, "g")} restantes
                  </Body>
                )}
                {category.key === "impressoras" && (
                  <Body muted>
                    {row.modelo} · {decimal(row.watts)} W
                  </Body>
                )}
                {category.key === "embalagens" && (
                  <Body>Custo unitário · {reais(row.custo)}</Body>
                )}
              </Card>
            ),
          )}
          {(q.data?.total ?? 0) > (q.data?.tamanho ?? 12) && (
            <Pagination
              page={page}
              onPage={setPage}
              total={q.data?.total ?? 0}
              size={q.data?.tamanho}
            />
          )}
        </>
      )}
    </ModuleScreen>
  );
}
