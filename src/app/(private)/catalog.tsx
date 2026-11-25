import { ListSearch } from "@/components/list-search";
import { CatalogEditor } from "@/features/catalog-editor";
import { pieceCalculation } from "@/features/calculation-route";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
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
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import { useTheme } from "@/theme/provider";
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
  const [page, setPage] = useState(0);
  const [lowOnly, setLowOnly] = useState(false);
  const [selecting, setSelecting] = useState(false),
    [selected, setSelected] = useState<string[]>([]),
    [confirm, setConfirm] = useState(false),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState("");
  const lock = useRef(false);
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
      encodeURIComponent(search.trim()),
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
          q.retry();
        }}
      />
    );
  if (mobile && piece)
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6 }}
        >
          {categories.map((c) => (
            <Chip
              key={c.key}
              label={c.label}
              selected={category === c}
              onPress={() => router.setParams({ categoria: c.key })}
            />
          ))}
        </ScrollView>
      )}
      {mobile && (
        <ListSearch
          accessibilityLabel={"Pesquisar em " + category.label}
          placeholder={"Pesquisar em " + category.label.toLowerCase() + "…"}
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(0);
          }}
        />
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
              <Button
                label={"+ " + category.create}
                onPress={() => {
                  setCreated(false);
                  setResult("");
                  setEditor({ purchase: false });
                }}
              />
            </View>
            <Button
              variant="secondary"
              label="Selecionar"
              onPress={() => {
                setCreated(false);
                setResult("");
                setSelecting(true);
              }}
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
              <Body muted>
                {lowOnly
                  ? "Nenhum filamento acabando nesta página."
                  : search
                    ? "Nenhum cadastro encontrado."
                    : "Nenhum cadastro nesta categoria."}
              </Body>
            </Card>
          )}
          {visible.map((row) =>
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
