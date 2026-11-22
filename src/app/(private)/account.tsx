import { useState } from "react";
import { ModuleScreen } from "@/components/module-screen";
import { Image, View, useWindowDimensions } from "react-native";
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
} from "@/components/ui";
export default function Account() {
  const { account, signOut } = useAuth();
  const mobile = useWindowDimensions().width < 900;
  const [editing, setEditing] = useState(false);
  const [old, setOld] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [changed, setChanged] = useState(false);
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
    <Frame section="Menu" title="Minha conta">
      {!mobile && (
        <Heading
          title="Minha conta"
          subtitle="Seus dados de acesso e segurança."
        />
      )}
      <View style={{ width: "100%", maxWidth: 640, gap: 20 }}>
        <Card
          style={
            mobile && { flexDirection: "row", alignItems: "center", gap: 16 }
          }
        >
          {mobile && (
            <Image
              source={require("../../../assets/images/cost3d-mascote.png")}
              resizeMode="contain"
              style={{ width: 64, height: 64 }}
            />
          )}
          <View style={{ flex: 1 }}>
            {mobile && <Body muted>E-mail</Body>}
            <Body strong={mobile}>{account?.email}</Body>
          </View>
        </Card>
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
          ) : mobile && !editing && !account?.trocaSenhaObrigatoria ? (
            <Button
              label="Alterar senha"
              variant="secondary"
              onPress={() => setEditing(true)}
            />
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
          {!changed && (
            <Button
              label="Sair da conta"
              variant="ghost"
              onPress={() => void signOut().catch((e) => setMessage(e.message))}
            />
          )}
          {!!message && <Notice message={message} />}
        </Card>
      </View>
    </Frame>
  );
}
