import { AccountBadge } from "@/components/account-badge";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Icon, type IconName } from "@/components/icon";
import { ModuleScreen, MenuRows } from "@/components/module-screen";
import { Body, Card, Notice } from "@/components/ui";
import { useAuth } from "@/auth/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { useStoreName, useTheme } from "@/theme/provider";
import { quantity, reais } from "@/features/format";
import { openWebsite } from "@/features/website";
import type { components } from "@/api/schema";

function Attention({
  title,
  subtitle,
  icon,
  onPress,
  warning = false,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  onPress: () => void;
  warning?: boolean;
}) {
  const t = useTheme();
  const wide = useWindowDimensions().width >= 900;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        ...(wide ? { flexGrow: 1, flexBasis: 220 } : {}),
        opacity: pressed ? 0.75 : 1,
      })}
    >
      <Card
        style={{
          minHeight: 64,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        }}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: warning ? t.dangerBackground : t.accentTint,
          }}
        >
          <Icon
            name={icon}
            color={warning ? t.danger : t.primaryText}
            size={21}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Body strong>{title}</Body>
          <Body muted>{subtitle}</Body>
        </View>
      </Card>
    </Pressable>
  );
}
export default function Home() {
  const { account } = useAuth(),
    t = useTheme(),
    name = useStoreName();
  const wide = useWindowDimensions().width >= 900;
  const q = useApiQuery<components["schemas"]["InicioLoja"]>(
    account?.tenantId ? "/inicio" : null,
  );
  const [error, setError] = useState("");
  function open(path: string) {
    setError("");
    void openWebsite(path).catch(() =>
      setError("Não foi possível abrir o site."),
    );
  }
  const data = q.data,
    low = data?.estoqueCritico,
    count = data?.aguardandoVenda ?? 0;
  return (
    <ModuleScreen lightHeader section="Minha loja" title={name}>
      {account?.tenantId && (
        <View
          style={{
            backgroundColor: t.primary,
            borderRadius: 16,
            padding: 18,
            gap: 14,
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AccountBadge />
            <Text
              style={{
                color: t.onPrimary,
                fontSize: 23,
                fontWeight: "700",
                flex: 1,
              }}
            >
              Dashboard
            </Text>
          </View>
          <Text style={{ color: t.onPrimary }}>
            Acompanhe o lucro, as vendas e a produção da loja.
          </Text>
          <Pressable
            accessibilityRole="link"
            onPress={() => router.push("/dashboard")}
            style={{
              alignSelf: "flex-start",
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 15,
              backgroundColor: t.surface,
            }}
          >
            <Text style={{ color: t.primaryText, fontWeight: "700" }}>
              Ver dashboard →
            </Text>
          </Pressable>
        </View>
      )}
      {!account?.tenantId ? (
        <MenuRows entries={[{ label: "Minha conta", route: "/account" }]} />
      ) : q.loading ? (
        <ActivityIndicator />
      ) : q.error ? (
        <Notice message={q.error} onRetry={q.retry} />
      ) : (
        <>
          <Card style={{ gap: 0 }}>
            <Body strong>Continue de onde parou</Body>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Body muted>Seus últimos cálculos</Body>
              <Text
                accessibilityRole="link"
                onPress={() =>
                  router.push({
                    pathname: "/calculate",
                    params: { modo: "historico" },
                  })
                }
                style={{
                  color: t.primaryText,
                  textDecorationLine: "underline",
                  fontWeight: "600",
                  paddingVertical: 6,
                }}
              >
                Ver histórico →
              </Text>
            </View>
            {data?.recentes?.length ? (
              data.recentes.map((r) => {
                const sold = r.situacao === "Vendido",
                  produced = r.situacao === "Produzido";
                return (
                  <Pressable
                    key={r.id}
                    accessibilityRole="link"
                    disabled={!r.id}
                    onPress={() =>
                      router.push({
                        pathname: "/calculate",
                        params: { modo: "detalhe", id: r.id! },
                      })
                    }
                    style={({ pressed }) => ({
                      paddingVertical: 12,
                      gap: 8,
                      borderTopWidth: 1,
                      borderColor: t.border,
                      opacity: pressed ? 0.7 : 1,
                      flexDirection: wide ? "row" : "column",
                      alignItems: wide ? "center" : "stretch",
                    })}
                  >
                    <View style={wide ? { flex: 1 } : undefined}>
                      <Body>
                        {r.nome}
                        {(r.unidades ?? 0) > 1
                          ? " · " + r.unidades + " un."
                          : ""}
                      </Body>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <View style={wide ? { minWidth: 140 } : { flexGrow: 1 }}>
                        <Body muted>Custo/un. {reais(r.custoUnitario)}</Body>
                      </View>
                      <Body strong>{reais(r.precoSugerido)}</Body>
                      <Text
                        style={{
                          color: sold ? t.onPrimary : t.text,
                          backgroundColor: sold
                            ? t.primary
                            : produced
                              ? t.accentTint
                              : t.surface,
                          borderColor: sold ? t.primary : t.border,
                          borderWidth: 1,
                          borderRadius: 5,
                          paddingHorizontal: 7,
                          paddingVertical: 3,
                          fontSize: 12,
                        }}
                      >
                        {r.situacao}
                      </Text>
                    </View>
                  </Pressable>
                );
              })
            ) : (
              <Body muted>Nenhum cálculo salvo ainda.</Body>
            )}
          </Card>
          <View style={{ marginTop: 8, gap: 3 }}>
            <Text
              accessibilityRole="header"
              style={{ fontSize: 21, fontWeight: "600", color: t.text }}
            >
              Precisa de atenção
            </Text>
            <Body muted>O que vale resolver agora</Body>
          </View>
          <View
            style={{
              flexDirection: wide ? "row" : "column",
              flexWrap: wide ? "wrap" : "nowrap",
              gap: 8,
            }}
          >
            {low && (
              <Attention
                warning
                icon="circle-half"
                title={"Filamento " + (low.cor || low.nome) + " acabando"}
                subtitle={quantity(low.estoque, "g") + " restantes"}
                onPress={() =>
                  router.navigate({
                    pathname: "/catalog",
                    params: { categoria: "filamentos" },
                  })
                }
              />
            )}
            {count > 0 && (
              <Attention
                icon="box"
                title={
                  count + (count === 1 ? " peça sem venda" : " peças sem venda")
                }
                subtitle="Produzidas e paradas"
                onPress={() => router.push("/sales")}
              />
            )}
            {data?.valorHoraConfigurado === false && (
              <Attention
                icon="clock-history"
                title="Defina o valor da sua hora"
                subtitle="Opcional · inclui mão de obra no cálculo"
                onPress={() =>
                  router.push({
                    pathname: "/settings",
                    params: { secao: "mao" },
                  })
                }
              />
            )}
          </View>
          {!low && count === 0 && data?.valorHoraConfigurado !== false && (
            <Body muted>Nenhuma pendência no momento.</Body>
          )}
          {!!error && <Notice message={error} />}
        </>
      )}
    </ModuleScreen>
  );
}
