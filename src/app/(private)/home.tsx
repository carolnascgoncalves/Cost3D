import { router } from "expo-router";
import { Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "@/auth/provider";
import { useTheme } from "@/theme/provider";
import { Body, Button, Card, Heading, Screen } from "@/components/ui";
export default function Home() {
  const { account } = useAuth();
  const t = useTheme();
  const wide = useWindowDimensions().width >= 700;
  return (
    <Screen>
      <Heading
        title="Boas-vindas ao Cost3D"
        subtitle="Sua loja organizada, de onde você estiver."
      />
      <Card style={{ backgroundColor: t.accentTint }}>
        <Text
          style={{
            color: t.primaryText,
            fontSize: 12,
            fontWeight: "700",
            letterSpacing: 1.5,
          }}
        >
          CADA CAMADA CONTA
        </Text>
        <Text
          style={{
            color: t.text,
            fontSize: 24,
            fontWeight: "600",
            lineHeight: 31,
          }}
        >
          Da primeira camada{wide ? "\n" : " "}ao próximo pedido.
        </Text>
        <Body muted>
          Um espaço para cuidar dos seus clientes e acompanhar o que entra e sai
          da sua produção.
        </Body>
      </Card>
      {!!account?.tenantId && (
        <View style={{ flexDirection: wide ? "row" : "column", gap: 16 }}>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: "600" }}>
              Clientes
            </Text>
            <Body muted>Contatos, orçamentos e informações sempre à mão.</Body>
            <Button
              label="Ver clientes"
              onPress={() => router.navigate("/customers")}
            />
          </Card>
          <Card style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontSize: 20, fontWeight: "600" }}>
              Movimentações
            </Text>
            <Body muted>
              Acompanhe materiais, produção e vendas no extrato.
            </Body>
            <Button
              label="Ver movimentações"
              onPress={() => router.navigate("/movements")}
            />
          </Card>
        </View>
      )}
      {!account?.tenantId && (
        <Card>
          <Body>
            Sua conta administrativa ainda não tem uma loja vinculada.
          </Body>
          <Button
            label="Minha conta"
            onPress={() => router.navigate("/account")}
          />
        </Card>
      )}
      <Text style={{ color: t.pageMuted, fontSize: 13, lineHeight: 21 }}>
        Cálculos, peças, materiais e vendas continuam disponíveis no site
        durante a migração.
      </Text>
    </Screen>
  );
}
