import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Body, Button, Card, Notice, ValueRow } from "@/components/ui";
import { ModuleScreen } from "@/components/module-screen";
import { useTheme } from "@/theme/provider";
import { useApiQuery } from "@/hooks/use-api-query";
import { LotOperation } from "@/features/lot-operation";
import { openWebsite } from "@/features/website";
import {
  Agenda,
  Job,
  addDays,
  clock,
  dateLabel,
  dayNumber,
  lastDay,
  localNow,
  overlaps,
  weekday,
} from "@/features/planning-dates";
import { PlanningWeek } from "@/features/planning-week";
import { NewPlan, PlanningSheet } from "@/features/planning-sheet";

function Toggle({
  label,
  active,
  press,
}: {
  label: string;
  active: boolean;
  press: () => void;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={press}
      style={{
        flexGrow: 1,
        minHeight: 42,
        paddingHorizontal: 8,
        borderRadius: 11,
        borderWidth: 1,
        borderColor: active ? "#44315f" : t.border,
        backgroundColor: active ? "#44315f" : t.surface,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontWeight: "700", color: active ? "#ffffff" : t.text }}>
        {label}
      </Text>
    </Pressable>
  );
}
function Status({ label }: { label: string }) {
  return (
    <Text
      style={{
        alignSelf: "flex-start",
        fontSize: 12,
        fontWeight: "600",
        color: "#205c38",
        backgroundColor: "#e5f2ea",
        borderRadius: 14,
        overflow: "hidden",
        paddingVertical: 5,
        paddingHorizontal: 9,
      }}
    >
      {label}
    </Text>
  );
}
export default function Planning() {
  const t = useTheme(),
    [now, setNow] = useState(localNow),
    today = now.slice(0, 10);
  useEffect(() => {
    const timer = setInterval(() => setNow(localNow()), 30000);
    return () => clearInterval(timer);
  }, []);
  const [done, setDone] = useState(false),
    [week, setWeek] = useState(false),
    [start, setStart] = useState(""),
    [picked, pick] = useState(""),
    [job, open] = useState<Job>(),
    [creating, create] = useState(false),
    [lot, setLot] = useState(""),
    [error, setError] = useState("");
  const q = useApiQuery<Agenda>(
    "/planejamentos?concluidos=" + done + (start ? "&inicio=" + start : ""),
  );
  const first = start || q.data?.inicio || addDays(today, -5),
    days = Array.from({ length: 7 }, (_, i) => addDays(first, i));
  const selected =
    picked ||
    (done
      ? q.data?.trabalhos.length
        ? days[2]
        : first
      : days.includes(today)
        ? today
        : first);
  const jobs = q.data?.trabalhos ?? [];
  function period(offset: number) {
    const day = addDays(first, offset);
    setStart(day);
    pick(day);
  }
  function tab(value: boolean) {
    if (value === done) return;
    setDone(value);
    setStart("");
    pick("");
    setWeek(false);
    setError("");
  }
  function details(j: Job) {
    setError("");
    open(j);
  }
  function inProgress(j: Job) {
    return !done && j.inicio <= now && now < j.fim;
  }
  function operation(j: Job) {
    open(undefined);
    setLot(j.loteId);
  }
  const groups = days
    .filter((d) => d >= selected)
    .map((day) => ({
      day,
      items: jobs.filter(
        (j) =>
          day ===
            (j.inicio.slice(0, 10) < selected
              ? selected
              : j.inicio.slice(0, 10)) && overlaps(j, day),
      ),
    }));
  const shift = (offset: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={offset < 0 ? "Semana anterior" : "Próxima semana"}
      onPress={() => period(offset)}
      style={{
        minWidth: 29,
        minHeight: 42,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: 24, color: t.primaryText }}>
        {offset < 0 ? "‹" : "›"}
      </Text>
    </Pressable>
  );
  const progress =
    job && inProgress(job)
      ? {
          day: dayNumber(today) - dayNumber(job.inicio) + 1,
          total: dayNumber(lastDay(job)) - dayNumber(job.inicio) + 1,
        }
      : null;
  if (lot)
    return (
      <LotOperation
        id={lot}
        onBack={() => {
          setLot("");
          q.retry();
        }}
      />
    );
  return (
    <View style={{ flex: 1 }}>
      <ModuleScreen
        lightHeader
        title="Planejar produção"
        section="Mais"
        onBack={() => router.navigate("/more")}
      >
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Toggle label="Na fila" active={!done} press={() => tab(false)} />
          <Toggle label="Concluídos" active={done} press={() => tab(true)} />
        </View>
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 6,
          }}
        >
          <View style={{ flexDirection: "row", gap: 5 }}>
            <Toggle
              label="Agenda"
              active={!week}
              press={() => setWeek(false)}
            />
            <Toggle label="Semana" active={week} press={() => setWeek(true)} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {shift(-7)}
            <Text style={{ color: t.text, fontWeight: "700" }}>
              {dateLabel(first)} – {dateLabel(days[6])}
            </Text>
            {shift(7)}
          </View>
        </View>
        {q.loading ? (
          <ActivityIndicator />
        ) : q.error ? (
          <Notice message={q.error} onRetry={q.retry} />
        ) : (
          q.data &&
          (week ? (
            <PlanningWeek
              agenda={q.data}
              days={days}
              today={today}
              done={done}
              open={details}
              selectDay={(d) => {
                pick(d);
                setWeek(false);
              }}
            />
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 2 }}>
                {days.map((day) => {
                  const active = day === selected,
                    isToday = day === today;
                  return (
                    <Pressable
                      key={day}
                      accessibilityRole="button"
                      accessibilityLabel={weekday(day) + " " + dateLabel(day)}
                      accessibilityState={{ selected: active }}
                      onPress={() => pick(day)}
                      style={{
                        flex: 1,
                        alignItems: "center",
                        gap: 3,
                        paddingVertical: 7,
                        borderRadius: 14,
                        backgroundColor: active
                          ? t.primary
                          : isToday
                            ? t.accentTint
                            : "transparent",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          color: active ? t.onPrimary : t.muted,
                        }}
                      >
                        {weekday(day)[0].toUpperCase()}
                      </Text>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: "700",
                          color: active ? t.onPrimary : t.text,
                        }}
                      >
                        {day.slice(8)}
                      </Text>
                      <View style={{ height: 5, flexDirection: "row", gap: 2 }}>
                        {jobs
                          .filter((j) => overlaps(j, day))
                          .slice(0, 3)
                          .map((j) => (
                            <View
                              key={j.id}
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: 3,
                                backgroundColor: active
                                  ? t.onPrimary
                                  : done
                                    ? "#408361"
                                    : t.primary,
                              }}
                            />
                          ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
              {groups
                .filter((g) => g.items.length || (g.day === selected && picked))
                .map(({ day, items }) => (
                  <View key={day} style={{ gap: 8 }}>
                    <Body strong>
                      {day === today
                        ? "Hoje · "
                        : day === addDays(today, 1)
                          ? "Amanhã · "
                          : ""}
                      {weekday(day)}, {dateLabel(day)}
                    </Body>
                    {!items.length && (
                      <Body muted>Nenhum trabalho neste dia.</Body>
                    )}
                    {items.map((j) => (
                      <Card
                        key={j.id}
                        style={{
                          borderLeftWidth: 5,
                          borderLeftColor: done ? "#42875e" : t.primary,
                        }}
                      >
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => details(j)}
                          style={{ gap: 5 }}
                        >
                          <Body strong>{j.nome}</Body>
                          <Body muted>
                            {j.impressora} ·{" "}
                            {j.inicio.slice(0, 10) < day
                              ? "começou em " + dateLabel(j.inicio)
                              : clock(j.inicio) +
                                " → " +
                                (j.fim.slice(0, 10) !== day
                                  ? dateLabel(j.fim) + " "
                                  : "") +
                                clock(j.fim)}
                          </Body>
                          {done ? (
                            <Status label="Concluído" />
                          ) : inProgress(j) ? (
                            <Status
                              label={
                                "Imprimindo · pronto " +
                                dateLabel(j.fim) +
                                " " +
                                clock(j.fim)
                              }
                            />
                          ) : null}
                        </Pressable>
                        {done && (
                          <Button
                            label="Operação do lote"
                            variant="secondary"
                            onPress={() => operation(j)}
                          />
                        )}
                      </Card>
                    ))}
                  </View>
                ))}
              {!picked && !groups.some((g) => g.items.length) && (
                <Card>
                  <Body muted>
                    {done
                      ? "Nenhum planejamento concluído neste período."
                      : "Nenhum trabalho agendado para estes dias."}
                  </Body>
                </Card>
              )}
            </>
          ))
        )}
        {!done && <View style={{ height: 65 }} />}
      </ModuleScreen>
      {!done && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Novo planejamento"
          onPress={() => create(true)}
          style={{
            position: "absolute",
            bottom: 16,
            right: 16,
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: t.primary,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 32, color: t.onPrimary }}>+</Text>
        </Pressable>
      )}
      {job && (
        <PlanningSheet title={job.nome} close={() => open(undefined)}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            {done || inProgress(job) ? (
              <Status label={done ? "Concluído" : "Imprimindo"} />
            ) : (
              <Body muted>
                {job.inicio > now ? "Na fila" : "Aguardando conclusão"}
              </Body>
            )}
            <Body muted>{job.impressora}</Body>
          </View>
          <ValueRow
            label="Começa"
            value={dateLabel(job.inicio) + " · " + clock(job.inicio)}
          />
          <ValueRow
            label="Fica pronto"
            value={dateLabel(job.fim) + " · " + clock(job.fim)}
          />
          {progress && (
            <View style={{ gap: 8 }}>
              <Body muted>
                Dia {progress.day} de {progress.total}
              </Body>
              <View
                style={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: t.accentTint,
                  overflow: "hidden",
                }}
              >
                <View
                  style={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: t.primary,
                    width: ((progress.day * 100) / progress.total +
                      "%") as `${number}%`,
                  }}
                />
              </View>
            </View>
          )}
          {!!error && <Notice message={error} />}
          {job.pedidoId && !done ? (
            <Button
              label="Acompanhar pedido"
              onPress={() =>
                void openWebsite("/orcamentos/" + job.pedidoId).catch(() =>
                  setError("Não foi possível abrir o pedido."),
                )
              }
            />
          ) : (
            <Button label="Operação do lote" onPress={() => operation(job)} />
          )}
        </PlanningSheet>
      )}
      {creating && (
        <NewPlan
          day={selected < today ? today : selected}
          close={() => create(false)}
          saved={(date) => {
            create(false);
            setStart(addDays(date, -5));
            pick(date);
            setWeek(false);
            q.retry();
          }}
        />
      )}
    </View>
  );
}
