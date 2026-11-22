import { useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "@/auth/provider";
import {
  Body,
  Button,
  Card,
  Empty,
  Heading,
  Notice,
  Screen,
} from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { openWebsite, websiteModules } from "@/features/website";
export default function More() {
  const { account } = useAuth();
  const t = useTheme();
  const wide = useWindowDimensions().width >= 1000;
  const [error, setError] = useState("");
  async function open(path: string) {
    setError("");
    try {
      await openWebsite(path);
    } catch {
      setError(
        "Não foi possível abrir o site. Confira o endereço configurado e tente novamente.",
      );
    }
  }
  if (!account?.tenantId)
    return (
      <Screen>
        <Empty
          title="Loja não vinculada"
          description="Esta conta ainda não tem uma loja vinculada."
        />
      </Screen>
    );
  return (
    <Screen>
      <Heading
        title="Mais da sua loja"
        subtitle="Acesse as outras áreas do Cost3D."
      />
      <Card>
        <Body>
          Estas áreas abrem no site, pelo navegador. Pode ser necessário entrar
          novamente na sua conta.
        </Body>
      </Card>
      {!!error && <Notice message={error} />}
      {websiteModules.map((group) => (
        <View key={group.title} style={{ gap: 14 }}>
          <Text
            accessibilityRole="header"
            style={{ color: t.pageText, fontSize: 20, fontWeight: "600" }}
          >
            {group.title}
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 14 }}>
            {group.items.map((item) => (
              <Card key={item.path} style={{ width: wide ? "48%" : "100%" }}>
                <Text
                  style={{ color: t.text, fontSize: 18, fontWeight: "600" }}
                >
                  {item.title}
                </Text>
                <Body muted>{item.description}</Body>
                <Button
                  label="Abrir no site ↗"
                  variant="secondary"
                  onPress={() => void open(item.path)}
                />
              </Card>
            ))}
          </View>
        </View>
      ))}
    </Screen>
  );
}
