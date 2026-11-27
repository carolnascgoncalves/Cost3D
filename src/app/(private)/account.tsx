import { useState } from "react";
import { ModuleScreen } from "@/components/module-screen";
import { Modal, Pressable, Text, View, useWindowDimensions } from "react-native";
import { useAuth } from "@/auth/provider";
import { request } from "@/api/session";
import type { components } from "@/api/schema";
import {
  Body,
  Button,
  Card,
  Field,
  Heading,
  Notice,
  Screen,
  layout,
} from "@/components/ui";
import { useStoreName, useTheme } from "@/theme/provider";

function AccountGlyph({ kind, color }: { kind: "lock" | "logout"; color: string }) {
  if (kind === "lock") {
    return (
      <View style={{ width: 19, height: 20, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 9, height: 8, borderWidth: 1.7, borderBottomWidth: 0, borderColor: color, borderTopLeftRadius: 5, borderTopRightRadius: 5, marginBottom: -1 }} />
        <View style={{ width: 15, height: 11, borderWidth: 1.7, borderColor: color, borderRadius: 3, alignItems: "center", justifyContent: "center" }}>
          <View style={{ width: 2.5, height: 2.5, borderRadius: 2, backgroundColor: color }} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ width: 19, height: 20, justifyContent: "center" }}>
      <View style={{ position: "absolute", right: 0, width: 12, height: 15, borderWidth: 1.7, borderLeftWidth: 0, borderColor: color, borderTopRightRadius: 3, borderBottomRightRadius: 3 }} />
      <View style={{ position: "absolute", left: 0, top: 9, width: 10, height: 1.8, backgroundColor: color, borderRadius: 2 }} />
      <View style={{ position: "absolute", left: 5, top: 6.5, width: 6, height: 6, borderTopWidth: 1.8, borderRightWidth: 1.8, borderColor: color, transform: [{ rotate: "45deg" }] }} />
    </View>
  );
}

export default function Account() {
  const { account, signOut } = useAuth();
  const t = useTheme();
  const storeName = useStoreName();
  const mobile = useWindowDimensions().width < 900;
  const [editing, setEditing] = useState(false);
  const [old, setOld] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [changed, setChanged] = useState(false);
  const [confirmSignOut, setConfirmSignOut] = useState(false);
  async function change() {
    if (busy) return;
    if (!old || password.length < 12 || password !== confirmation) {
      setMessage(
        "Informe a senha atual, uma nova senha com pelo menos 12 caracteres e a confirmação igual.",
      );
      return;
    }
    setBusy(true);
    setMessage("");
    const data: components["schemas"]["AlterarSenhaRequest"] = {
      senhaAtual: old,
      novaSenha: password,
      confirmarNovaSenha: confirmation,
    };
    try {
      await request("/auth/senha", {
        method: "POST",
        body: JSON.stringify(data),
      });
      setOld("");
      setPassword("");
      setConfirmation("");
      setChanged(true);
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Não foi possível alterar a senha.",
      );
    } finally {
      setBusy(false);
    }
  }
  const Frame = mobile ? ModuleScreen : Screen;
  return (
    <Frame section="Conta" title="Minha conta">
      {!mobile && (
        <Heading
          title="Minha conta"
          subtitle="Seus dados de acesso e segurança."
        />
      )}
      <View style={{ width: "100%", maxWidth: 640, gap: 16 }}>
        <View style={{ alignItems: "center", gap: 1, paddingTop: 6, paddingBottom: 8 }}>
          <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: t.onPrimary, fontSize: 30, fontWeight: "700" }}>{account?.email?.trim().slice(0, 1).toUpperCase() || "C"}</Text>
          </View>
          <Body strong>{account?.email}</Body>
          {!!storeName && <Text style={{ color: t.muted, fontSize: 12, lineHeight: 16 }}>{storeName}</Text>}
        </View>
        <Card>
          {changed ? (
            <>
              <Body>Senha alterada. Entre novamente com sua nova senha.</Body>
              <Button
                label="Voltar ao login"
                onPress={() => {
                  void signOut().catch((e) => setMessage(e.message));
                }}
              />
            </>
          ) : !editing && !account?.trocaSenhaObrigatoria ? (
            <View style={{ gap: 0 }}>
              <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10, borderBottomWidth: 1, borderColor: t.border }}>
                <AccountGlyph kind="lock" color={t.muted} />
                <Text style={{ flex: 1, color: t.text, fontSize: 15 }}>Alterar senha</Text>
                <Text style={{ color: t.muted, fontSize: 20, lineHeight: 21 }}>›</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setConfirmSignOut(true)} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <AccountGlyph kind="logout" color={t.danger} />
                <Text style={{ flex: 1, color: t.danger, fontSize: 15 }}>Sair da conta</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Body>
                {account?.trocaSenhaObrigatoria
                  ? "Para continuar, altere sua senha temporária."
                  : "Alterar senha"}
              </Body>
              <Field
                label="Senha atual"
                secureTextEntry
                value={old}
                onChangeText={setOld}
                editable={!busy}
                autoComplete="current-password"
              />
              <Field
                label="Nova senha (mínimo 12 caracteres)"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                editable={!busy}
                autoComplete="new-password"
              />
              <Field
                label="Confirmar nova senha"
                secureTextEntry
                value={confirmation}
                onChangeText={setConfirmation}
                editable={!busy}
                autoComplete="new-password"
              />
              <Button
                label="Salvar nova senha"
                busy={busy}
                onPress={() => void change()}
              />
            </>
          )}
          {!changed && (editing || account?.trocaSenhaObrigatoria) && (
            <Button
              label="‹ Voltar"
              variant="ghost"
              onPress={() => { setEditing(false); setMessage(""); }}
            />
          )}
          {!!message && <Notice message={message} />}
        </Card>
      </View>
      <Modal visible={confirmSignOut} transparent animationType="slide" onRequestClose={() => setConfirmSignOut(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#24183580" }}>
          <Pressable onPress={() => setConfirmSignOut(false)} style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }} />
          <Card style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0, padding: 20, gap: 8 }}>
            <View style={{ ...layout.row, justifyContent: "space-between" }}><View style={{ flex: 1 }}><Body strong>Sair da conta?</Body><Body muted>Você vai precisar entrar de novo com seu e-mail e senha.</Body></View><Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setConfirmSignOut(false)}><Text style={{ color: t.muted, fontSize: 24 }}>×</Text></Pressable></View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1 }}><Button stretch label="Sair" variant="danger" onPress={() => void signOut().then(() => setConfirmSignOut(false)).catch((e) => setMessage(e.message))} /></View>
              <View style={{ flex: 1 }}><Button stretch label="Cancelar" variant="secondary" onPress={() => setConfirmSignOut(false)} /></View>
            </View>
          </Card>
        </View>
      </Modal>
    </Frame>
  );
}
