import { pieceCalculation } from "@/features/mobile-calculations";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  TextInput,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { ModuleScreen, MenuRows, SiteButton } from "@/components/module-screen";
import { Body, Card, Chip, Notice, Pagination, layout } from "@/components/ui";
import { CatalogDetail } from "@/components/catalog-detail";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";
import { decimal, quantity, reais } from "@/features/format";
import {
  CatalogCard,
  stockLevel,
  type CatalogRow as Row,
} from "@/components/catalog-card";

const categories = [
  { label: "Peças", key: "pecas", create: "Nova peça", site: "/peca/novo" },
  {
    label: "Filamentos",
    key: "filamentos",
    create: "Novo filamento",
    site: "/filamento/novo",
  },
  {
    label: "Impressoras",
    key: "impressoras",
    create: "Nova impressora",
    site: "/impressora/novo",
  },
  {
    label: "Embalagens",
    key: "embalagens",
    create: "Nova embalagem",
    site: "/embalagem/novo",
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
  const [piece, setPiece] = useState<Row>();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [lowOnly, setLowOnly] = useState(false);
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
  if (mobile && piece)
    return (
      <CatalogDetail
        category={category.key}
        row={items.find((item) => item.id === piece.id) ?? piece}
        onBack={() => setPiece(undefined)}
      />
    );
  return (
    <ModuleScreen section="Seu catálogo" title={category.label}>
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
      {mobile && (
        <TextInput
          accessibilityLabel={"Pesquisar em " + category.label}
          placeholder={"Pesquisar em " + category.label.toLowerCase() + "…"}
          placeholderTextColor={t.muted}
          value={search}
          onChangeText={(value) => {
            setSearch(value);
            setPage(0);
          }}
          maxLength={150}
          style={{
            borderWidth: 1,
            borderColor: t.border,
            backgroundColor: t.surface,
            color: t.text,
            borderRadius: 12,
            paddingHorizontal: 12,
            minHeight: 44,
          }}
        />
      )}
      {mobile ? (
        <SiteButton label={"+ " + category.create} site={category.site} />
      ) : (
        <MenuRows entries={[{ label: category.create, site: category.site }]} />
      )}
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
            mobile ? (
              <CatalogCard
                key={row.id}
                category={category.key}
                row={row}
                onDetails={() => setPiece(row)}
              />
            ) : (
              <Card key={row.id}>
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
