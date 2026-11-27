import { useState } from "react";
import { ActivityIndicator, Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { ModuleScreen } from "@/components/module-screen";
import {
  Body,
  Button,
  Card,
  Notice,
  Pagination,
  layout,
} from "@/components/ui";
import { Icon } from "@/components/icon";
import { useTheme } from "@/theme/provider";
import { CalculationPhoto } from "@/features/mobile-calculations";
import { LotOperation } from "@/features/lot-operation";
import { useApiQuery } from "@/hooks/use-api-query";
import { reais } from "@/features/format";
import type { components } from "@/api/schema";
const groups = [
  ["PARA_PRODUZIR", "Para produzir"],
  ["ESTOQUE", "Em estoque"],
  ["VENDIDOS", "Vendidas"],
] as const;
function platformName(value?: string) {
  if (!value || value === "NENHUMA") return "Sem plataforma";
  const names: Record<string, string> = {
    MERCADO_LIVRE: "Mercado Livre",
    SHOPEE: "Shopee",
    AMAZON: "Amazon",
    TIKTOK: "TikTok",
    TIKTOK_SHOP: "TikTok Shop",
    INSTAGRAM: "Instagram",
    FACEBOOK: "Facebook",
    ETSY: "Etsy",
  };
  return names[value] ?? value.toLocaleLowerCase("pt-BR").split("_").map((part) => part.charAt(0).toLocaleUpperCase("pt-BR") + part.slice(1)).join(" ");
}
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
      <View style={{ flexDirection: "row", padding: 4, borderRadius: 13, backgroundColor: t.accentTint, gap: 4 }}>
        {groups.map(([key, label]) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: key === group }}
            onPress={() => {
              setPage(0);
              setGroup(key);
            }}
            style={{ flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", paddingHorizontal: 5, borderRadius: 10, backgroundColor: key === group ? t.surface : "transparent", borderWidth: key === group ? 1 : 0, borderColor: t.border }}
          ><Text style={{ color: key === group ? t.primaryText : t.muted, fontWeight: key === group ? "700" : "500", fontSize: 12 }}>{label}</Text></Pressable>
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
            <Card key={l.id} style={{ gap: 10 }}>
              <Pressable accessibilityRole="button" accessibilityLabel={"Abrir lote de " + l.nome} onPress={() => select(l.id!)} style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <CalculationPhoto id={l.id} name={l.nome} size={52} />
                  <View style={{ flex: 1, minHeight: 52, justifyContent: "space-between", minWidth: 0 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <View style={{ flex: 1 }}><Body strong>{l.nome}</Body></View>
                      <Icon name="chevron-right" color={t.muted} size={13} />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={{ color: t.muted, backgroundColor: t.accentTint, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, fontSize: 12 }}>{platformName(l.plataforma)}</Text>
                      <Text style={{ color: t.muted, fontSize: 12 }}>Venda <Text style={{ color: t.text, fontWeight: "700" }}>{reais(l.preco)}</Text></Text>
                    </View>
                  </View>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                  <Body muted>{group === "ESTOQUE" ? `Disponível ${l.disponiveis ?? 0}` : group === "VENDIDOS" ? `${l.vendidas ?? 0} un. vendidas` : `${l.unidades ?? 1} un. para produzir`}</Body>
                  {!!l.reservadas ? <Text numberOfLines={1} adjustsFontSizeToFit style={{ maxWidth: "100%", color: "#765700", backgroundColor: "#FFF1C2", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, fontSize: 12 }}>{l.reservadas} reservadas para pedidos</Text> : <Body muted>Reservadas 0</Body>}
                </View>
              </Pressable>
              <Button
                variant="secondary"
                label={
                  group === "ESTOQUE" && l.disponiveis
                    ? "Registrar venda"
                    : "Ver lote"
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
