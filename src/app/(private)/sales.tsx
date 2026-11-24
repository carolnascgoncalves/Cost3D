import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ModuleScreen } from "@/components/module-screen";
import {
  Badge,
  Body,
  Button,
  Card,
  Chip,
  Notice,
  Pagination,
  layout,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useTheme } from "@/theme/provider";
import { CalculationIdentity } from "@/features/mobile-calculations";
import { LotOperation } from "@/features/lot-operation";
import { useApiQuery } from "@/hooks/use-api-query";
import { reais } from "@/features/format";
import type { components } from "@/api/schema";
const groups = [
  ["PARA_PRODUZIR", "Para produzir"],
  ["ESTOQUE", "Em estoque"],
  ["VENDIDOS", "Vendidas"],
] as const;
export default function Sales() {
  const t = useTheme(),
    [id, select] = useState(""),
    [group, setGroup] = useState<string>("ESTOQUE"),
    [page, setPage] = useState(0);
  const q = useApiQuery<components["schemas"]["PaginaResponseLoteResumo"]>(
    id ? null : `/vendas?grupo=${group}&pagina=${page}`,
  );
  const empty =
    group === "ESTOQUE"
      ? [
          "Nada em estoque ainda",
          "Quando você produzir uma peça, ela aparece aqui.",
          "Ver o que produzir",
        ]
      : group === "VENDIDOS"
        ? [
            "Nenhuma venda registrada",
            "Quando você vender uma peça, ela aparece aqui.",
            "Ver estoque",
          ]
        : [
            "Nenhum lote para produzir",
            "Salve um cálculo para começar a produção da peça.",
            "Calcular e salvar",
          ];
  if (id) return <LotOperation key={id} id={id} onBack={() => select("")} />;
  return (
    <ModuleScreen
      lightHeader
      fillContent
      section="Comercial"
      title="Vendas e estoque"
    >
      <View style={layout.row}>
        {groups.map(([key, label]) => (
          <Chip
            key={key}
            label={label}
            selected={key === group}
            onPress={() => {
              setPage(0);
              setGroup(key);
            }}
          />
        ))}
      </View>
      {q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          {!q.data?.itens?.length && (
            <View
              style={{
                flexGrow: 1,
                justifyContent: "center",
                alignItems: "center",
                gap: 12,
                paddingHorizontal: 18,
                paddingVertical: 28,
              }}
            >
              <Image
                accessible={false}
                source={require("../../../assets/images/cost3d-icone-marsala.png")}
                resizeMode="contain"
                style={{ width: 84, height: 84, borderRadius: 20 }}
              />
              <Text
                style={{
                  color: t.pageText,
                  fontSize: 20,
                  fontWeight: "700",
                  textAlign: "center",
                }}
              >
                {empty[0]}
              </Text>
              <Text
                style={{
                  color: t.pageMuted,
                  fontSize: 15,
                  textAlign: "center",
                  maxWidth: 290,
                }}
              >
                {empty[1]}
              </Text>
              <Button
                label={empty[2]}
                onPress={() => {
                  setPage(0);
                  if (group === "PARA_PRODUZIR")
                    router.push({
                      pathname: "/calculate",
                      params: { modo: "salvar" },
                    });
                  else
                    setGroup(group === "ESTOQUE" ? "PARA_PRODUZIR" : "ESTOQUE");
                }}
              />
            </View>
          )}
          {q.data?.itens?.map((l) => (
            <Card key={l.id}>
              <View
                style={{ gap: 8, flexDirection: "row", alignItems: "center" }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <CalculationIdentity id={l.id} name={l.nome} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={"Ver detalhes de " + l.nome}
                  onPress={() => select(l.id!)}
                  style={{
                    width: 44,
                    height: 44,
                    borderWidth: 1,
                    borderColor: t.border,
                    borderRadius: 10,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="eye" color={t.primaryText} />
                </Pressable>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                <Body muted>
                  {!l.plataforma || l.plataforma === "NENHUMA"
                    ? "Sem plataforma"
                    : l.plataforma.replaceAll("_", " ")}
                </Body>
                <Body strong>{reais(l.preco)} / un.</Body>
              </View>
              <Body>
                {group === "ESTOQUE"
                  ? (l.disponiveis ?? 0) + " un. disponíveis"
                  : group === "VENDIDOS"
                    ? (l.vendidas ?? 0) + " un. vendidas"
                    : (l.unidades ?? 1) + " un. para produzir"}
              </Body>
              {!!l.reservadas && (
                <Badge>{l.reservadas} un. reservadas para pedidos</Badge>
              )}
              <Button
                variant="secondary"
                label={
                  group === "PARA_PRODUZIR"
                    ? "Revisar produção"
                    : group === "ESTOQUE" && l.disponiveis
                      ? "Registrar venda"
                      : "Ver operação do lote"
                }
                onPress={() => select(l.id!)}
              />
            </Card>
          ))}
          {(q.data?.total ?? 0) > (q.data?.tamanho ?? 12) && (
            <Pagination
              page={page}
              total={q.data!.total!}
              size={q.data?.tamanho}
              onPage={setPage}
            />
          )}
        </>
      )}
    </ModuleScreen>
  );
}
