import { FormScrollView } from "@/components/form-scroll";
import { useState, useRef, type PropsWithChildren } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Body, Button, Field, Notice, Pagination } from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { request } from "@/api/session";
import type { components } from "@/api/schema";
import { operationKey } from "./operation-key";
import { clock, dateLabel, localNow } from "./planning-dates";
export function PlanningSheet({
  title,
  close,
  children,
}: PropsWithChildren<{ title: string; close: () => void }>) {
  const t = useTheme(),
    insets = useSafeAreaInsets();
  return (
    <Modal transparent animationType="slide" onRequestClose={close}>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "#21163277",
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          accessibilityRole="button"
          accessibilityLabel="Fechar"
          onPress={close}
        />
        <View
          accessibilityViewIsModal
          style={{
            maxHeight: "88%",
            backgroundColor: t.surface,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            width: "100%",
            alignSelf: "center",
            maxWidth: 700,
            padding: 18,
            paddingBottom: Math.max(18, insets.bottom),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              marginBottom: 12,
            }}
          >
            <Text
              style={{
                flex: 1,
                fontSize: 19,
                fontWeight: "700",
                color: t.text,
              }}
            >
              {title}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={close}
              hitSlop={8}
            >
              <Text style={{ fontSize: 25, color: t.muted }}>×</Text>
            </Pressable>
          </View>
          <FormScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ gap: 12 }}
          >
            {children}
          </FormScrollView>
        </View>
      </View>
    </Modal>
  );
}
type Lote = components["schemas"]["LoteResumo"];
export function NewPlan({
  day,
  close,
  saved,
}: {
  day: string;
  close: () => void;
  saved: (day: string) => void;
}) {
  const t = useTheme(),
    [lot, setLot] = useState<Lote>(),
    [page, pageTo] = useState(0);
  const q = useApiQuery<components["schemas"]["PaginaResponseLoteResumo"]>(
    lot ? null : "/vendas?grupo=PARA_PRODUZIR&pagina=" + page,
  );
  const [date, setDate] = useState(dateLabel(day) + "/" + day.slice(0, 4)),
    [time, setTime] = useState(clock(localNow())),
    [units, setUnits] = useState("1"),
    [capacity, setCapacity] = useState("1"),
    [interval, setInterval] = useState("10"),
    [slack, setSlack] = useState("10");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    lock = useRef(false),
    attempt = useRef({ body: "", key: "" });
  async function submit() {
    if (lock.current) return;
    const [d, m, y] = date.split("/"),
      iso = y + "-" + m + "-" + d;
    const parsed = new Date(iso + "T00:00:00Z");
    if (
      !/^\d{2}\/\d{2}\/\d{4}$/.test(date) ||
      isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== iso ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)
    ) {
      setError("Confira a data e a hora de início.");
      return;
    }
    if (
      ![units, capacity, interval, slack].every((n) => /^\d+$/.test(n)) ||
      +units < 1 ||
      +units > 500 ||
      +capacity < 1 ||
      +capacity > +units ||
      +interval > 1440 ||
      +slack > 100
    ) {
      setError(
        "Confira as unidades (1 a 500), a capacidade, o intervalo (até 1440 min) e a folga (até 100%).",
      );
      return;
    }
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const body = JSON.stringify({
        calculoId: lot?.id,
        inicio: iso + "T" + time,
        unidades: +units,
        capacidade: +capacity,
        intervalo: +interval,
        folga: +slack,
      });
      if (attempt.current.body !== body)
        attempt.current = { body, key: operationKey() };
      const start = await request<string>(
        "/planejamentos?chave=" + attempt.current.key,
        { method: "POST", body },
      );
      saved(start);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <PlanningSheet
      title="Novo planejamento"
      close={() => {
        if (!lock.current) close();
      }}
    >
      {!lot ? (
        <>
          <Body strong>Escolha um lote para produzir</Body>
          {q.loading ? (
            <ActivityIndicator />
          ) : q.error ? (
            <Notice message={q.error} onRetry={q.retry} />
          ) : (
            <>
              {q.data?.itens?.map((l) => (
                <Pressable
                  key={l.id}
                  onPress={() => {
                    setLot(l);
                    setUnits(String(l.unidades || 1));
                  }}
                  style={{
                    borderBottomWidth: 1,
                    borderColor: t.border,
                    paddingVertical: 10,
                  }}
                >
                  <Body strong>{l.nome}</Body>
                  <Body muted>{l.unidades} un.</Body>
                </Pressable>
              ))}
              {!q.data?.itens?.length && (
                <Body muted>
                  Nenhum lote para produzir. Salve um cálculo para planejar a
                  impressão.
                </Body>
              )}
              <Pagination
                page={page}
                total={q.data?.total ?? 0}
                size={q.data?.tamanho}
                onPage={pageTo}
              />
            </>
          )}
        </>
      ) : (
        <>
          <Body strong>{lot.nome}</Body>
          <Button
            label="Trocar lote"
            variant="ghost"
            disabled={busy}
            onPress={() => setLot(undefined)}
          />
          <Field
            label="Data de início (DD/MM/AAAA)"
            value={date}
            onChangeText={setDate}
          />
          <Field
            label="Hora de início (HH:MM)"
            value={time}
            onChangeText={setTime}
          />
          {(
            [
              ["Unidades", units, setUnits],
              ["Peças por impressão", capacity, setCapacity],
              ["Intervalo entre impressões (min)", interval, setInterval],
              ["Folga (%)", slack, setSlack],
            ] as const
          ).map(([label, value, onChangeText]) => (
            <Field
              key={label}
              label={label}
              value={value}
              onChangeText={onChangeText}
              keyboardType="number-pad"
            />
          ))}
          {!!error && <Notice message={error} />}
          <Button
            label="Salvar planejamento"
            busy={busy}
            onPress={() => void submit()}
          />
        </>
      )}
    </PlanningSheet>
  );
}
