import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { ModuleScreen, MenuRows } from "@/components/module-screen";
import { Body, Card, Chip, Notice, Pagination, layout } from "@/components/ui";
import { useApiQuery } from "@/hooks/use-api-query";
import { useTheme } from "@/theme/provider";
import { decimal, quantity, reais } from "@/features/format";
import type { components } from "@/api/schema";

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
type Schemas = components["schemas"];
type Row = Schemas["PecaCatalogo"] &
  Schemas["FilamentoCatalogo"] &
  Schemas["EmbalagemCatalogo"] &
  Schemas["ImpressoraCatalogo"];

export default function Catalog() {
  const { categoria } = useLocalSearchParams<{ categoria?: string }>();
  const category = categories.find((c) => c.key === categoria) ?? categories[0];
  return (
    <ModuleScreen section="Seu catálogo" title={category.label}>
      <View style={layout.row}>
        {categories.map((c) => (
          <Chip
            key={c.key}
            label={c.label}
            selected={category === c}
            onPress={() => router.setParams({ categoria: c.key })}
          />
        ))}
      </View>
      <Listings key={category.key} category={category} />
    </ModuleScreen>
  );
}

function Listings({ category }: { category: Category }) {
  const t = useTheme();
  const [page, setPage] = useState(0);
  const q = useApiQuery<{ itens?: Row[]; total?: number; tamanho?: number }>(
    `/catalogo/${category.key}?pagina=${page}`,
  );
  return (
    <>
      <MenuRows entries={[{ label: category.create, site: category.site }]} />
      {q.loading ? (
        <ActivityIndicator color={t.primaryText} />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          {!q.data?.itens?.length && (
            <Card>
              <Body muted>Nenhum cadastro nesta categoria.</Body>
            </Card>
          )}
          {q.data?.itens?.map((row) => (
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
                    {quantity(row.gramas, "g")} · {row.minutos} min de impressão
                  </Body>
                  <Body>Último preço · {reais(row.preco)}</Body>
                  {row.id && (
                    <MenuRows
                      entries={[
                        {
                          label: "Calcular",
                          site: `/historico/novo?pecaCriada=${encodeURIComponent(row.id)}`,
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
          ))}
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
    </>
  );
}
