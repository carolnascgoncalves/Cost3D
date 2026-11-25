import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Body, Card } from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { type Job, type Agenda, weekday, barRange } from "./planning-dates";
export function PlanningWeek({
  agenda,
  days,
  today,
  done,
  open,
  selectDay,
}: {
  agenda: Agenda;
  days: string[];
  today: string;
  done: boolean;
  open: (job: Job) => void;
  selectDay: (day: string) => void;
}) {
  const t = useTheme(),
    [height, setHeight] = useState(0),
    index = days.indexOf(today);
  const printers = new Map(agenda.impressoras.map((p) => [p.id, p.nome]));
  for (const job of agenda.trabalhos)
    if (!printers.has(job.impressoraId))
      printers.set(job.impressoraId, job.impressora);
  return (
    <>
      <Card>
        <View>
          <View style={{ flexDirection: "row" }}>
            {days.map((d) => (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={"Abrir agenda de " + d}
                onPress={() => selectDay(d)}
                style={{ flex: 1, alignItems: "center", gap: 3 }}
              >
                <Text style={{ color: t.muted, fontSize: 12 }}>
                  {weekday(d)[0].toUpperCase()}
                </Text>
                <Text
                  style={{
                    textAlign: "center",
                    lineHeight: 28,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    overflow: "hidden",
                    backgroundColor: d === today ? t.primary : t.surface,
                    color: d === today ? t.onPrimary : t.text,
                    fontWeight: "700",
                  }}
                >
                  {d.slice(8)}
                </Text>
              </Pressable>
            ))}
          </View>
          <View
            onLayout={(e) => setHeight(e.nativeEvent.layout.height)}
            style={{ paddingVertical: 10, gap: 16 }}
          >
            {index >= 0 && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  left: (((index + 0.5) * 100) / 7 + "%") as `${number}%`,
                  top: 0,
                  bottom: 0,
                  overflow: "hidden",
                }}
              >
                {Array.from({ length: Math.ceil(height / 9) }, (_, i) => (
                  <View
                    key={i}
                    style={{
                      height: 5,
                      width: 1.5,
                      marginBottom: 4,
                      backgroundColor: "#c6bfce",
                    }}
                  />
                ))}
              </View>
            )}
            {[...printers].map(([id, name], i) => {
              const jobs = agenda.trabalhos.filter(
                (j) => j.impressoraId === id,
              );
              const color = done
                ? "#408361"
                : [t.primary, "#438c87", "#aa7149"][i % 3];
              return (
                <View key={id} style={{ gap: 12 }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 5,
                    }}
                  >
                    <Text
                      style={{
                        backgroundColor: i % 2 ? "#e0efec" : t.accentTint,
                        color: t.text,
                        paddingHorizontal: 9,
                        paddingVertical: 6,
                        borderRadius: 12,
                        overflow: "hidden",
                        fontSize: 12,
                      }}
                    >
                      {name}
                    </Text>
                    {!jobs.length && (
                      <Text
                        style={{
                          backgroundColor: t.surface,
                          color: t.muted,
                          fontSize: 12,
                        }}
                      >
                        Sem trabalhos nesta semana
                      </Text>
                    )}
                  </View>
                  {jobs.map((j) => {
                    const r = barRange(j, days[0]);
                    const width = Math.max(r.right - r.left, 0.025);
                    return (
                      <Pressable
                        key={j.id}
                        accessibilityRole="button"
                        onPress={() => open(j)}
                        style={{ paddingVertical: 4, gap: 5 }}
                      >
                        <Text
                          style={{
                            alignSelf: "flex-start",
                            backgroundColor: t.surface,
                            color: t.text,
                            paddingVertical: 4,
                            paddingRight: 4,
                            fontWeight: "600",
                          }}
                        >
                          {j.nome}
                        </Text>
                        <View style={{ height: 13 }}>
                          <View
                            style={{
                              position: "absolute",
                              left: (100 * Math.min(r.left, 1 - width) +
                                "%") as `${number}%`,
                              width: (100 * width + "%") as `${number}%`,
                              height: 13,
                              borderRadius: 7,
                              backgroundColor: color,
                            }}
                          />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              );
            })}
            {!printers.size && (
              <Body muted>Nenhuma impressora cadastrada.</Body>
            )}
          </View>
        </View>
      </Card>
      <Body muted>
        Toque em um dia para abrir a agenda dele. A linha tracejada indica hoje.
      </Body>
    </>
  );
}
