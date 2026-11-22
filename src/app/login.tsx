import { useState } from "react";
import { Redirect } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/auth/provider";
import { useTheme } from "@/theme/provider";
import { Body, Button, Card, Field, Notice } from "@/components/ui";
import { BrandLogo } from "@/components/brand-logo";
export default function Login() {
  const auth = useAuth();
  const t = useTheme();
  const wide = useWindowDimensions().width >= 900;
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [help, setHelp] = useState(false);
  if (auth.loading)
    return (
      <View style={[s.loading, { backgroundColor: t.background }]}>
        <ActivityIndicator
          color={t.primaryText}
          accessibilityLabel="Restaurando sessão"
        />
      </View>
    );
  if (auth.account) return <Redirect href="/home" />;
  async function submit() {
    if (busy) return;
    if (!email.trim() || !senha) {
      setError("Preencha o e-mail e a senha.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await auth.signIn(email, senha);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <SafeAreaView style={[s.loading, { backgroundColor: t.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.container}
        >
          <View style={[s.layout, wide && s.desktop]}>
            <View style={wide ? s.brandDesktop : s.brandMobile}>
              <BrandLogo width={wide ? 390 : 240} />
              {wide && (
                <>
                  <Text
                    style={{
                      color: t.pageText,
                      fontSize: 40,
                      lineHeight: 47,
                      fontWeight: "600",
                      letterSpacing: -1,
                    }}
                  >
                    Da primeira camada{"\n"}ao próximo pedido.
                  </Text>
                  <Text
                    style={{
                      color: t.pageMuted,
                      fontSize: 17,
                      lineHeight: 29,
                      maxWidth: 380,
                    }}
                  >
                    Calcule seus preços, organize a produção e acompanhe suas
                    vendas em um só lugar.
                  </Text>
                  <Text
                    style={{ color: t.primaryText, marginTop: 8, fontSize: 14 }}
                  >
                    Cada camada conta.
                  </Text>
                </>
              )}
            </View>
            <Card style={[s.form, wide && { padding: 36 }]}>
              <Text
                style={{
                  color: t.muted,
                  fontSize: 11,
                  fontWeight: "700",
                  letterSpacing: 1.5,
                }}
              >
                BOAS-VINDAS À COST3D
              </Text>
              <Text
                accessibilityRole="header"
                style={{
                  color: t.text,
                  fontSize: 28,
                  fontWeight: "700",
                  letterSpacing: -0.6,
                }}
              >
                Bom ter você por aqui.
              </Text>
              <Body muted>Entre na sua conta para continuar.</Body>
              <View style={{ gap: 20, marginTop: 10 }}>
                <Field
                  label="E-mail"
                  placeholder="voce@exemplo.com"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  autoComplete="email"
                  value={email}
                  onChangeText={setEmail}
                  editable={!busy}
                />
                <Field
                  label="Senha"
                  placeholder="Digite sua senha"
                  secureTextEntry={!visible}
                  autoCapitalize="none"
                  autoComplete="current-password"
                  value={senha}
                  onChangeText={setSenha}
                  editable={!busy}
                  onSubmitEditing={() => void submit()}
                />
              </View>
              <Button
                label={visible ? "Ocultar senha" : "Mostrar senha"}
                variant="ghost"
                onPress={() => setVisible(!visible)}
              />
              {!!(error || auth.error) && (
                <Notice
                  message={error || auth.error}
                  onRetry={auth.error ? () => void auth.restore() : undefined}
                />
              )}
              <Button
                label="Entrar"
                busy={busy}
                onPress={() => void submit()}
              />
              <Button
                label="Ainda não tem conta?"
                variant="ghost"
                onPress={() => setHelp(!help)}
              />
              {help && (
                <Body muted>
                  Peça à pessoa responsável pela loja para criar seu acesso com
                  seu e-mail.
                </Body>
              )}
            </Card>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const s = StyleSheet.create({
  loading: { flex: 1 },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  layout: { width: "100%", maxWidth: 1040, alignItems: "center", gap: 28 },
  desktop: { flexDirection: "row", gap: 72 },
  brandDesktop: { flex: 1, gap: 24 },
  brandMobile: { paddingVertical: 8 },
  form: { width: "100%", maxWidth: 420, padding: 24, borderRadius: 16 },
});
