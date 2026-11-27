import { Pressable, Text, View } from "react-native";
import { Body, Card } from "@/components/ui";
import { useTheme } from "@/theme/provider";
import { type Job, type Agenda, weekday, weekPrinters } from "./planning-dates";

function timestamp(value: string) {
  return Date.parse(value.slice(0, 23) + "Z");
}
function durationInDay(job: Job, day: string) {
  const from = Date.parse(day + "T00:00:00Z");
  const to = from + 24 * 60 * 60 * 1000;
  return Math.max(0, Math.min(timestamp(job.fim), to) - Math.max(timestamp(job.inicio), from));
}
function hoursLabel(ms: number) {
  const minutes = Math.round(ms / 60000);
  if (!minutes) return "–";
  const hours = Math.floor(minutes / 60), remainder = minutes % 60;
  return hours ? `${hours} h${remainder ? ` ${remainder} min` : ""}` : `${minutes} min`;
}

export function PlanningWeek({
  agenda,
  days,
  today,
  selectedDay,
  done,
  open,
  selectDay,
}: {
  agenda: Agenda;
  days: string[];
  today: string;
  selectedDay: string;
  done: boolean;
  open: (job: Job) => void;
  selectDay: (day: string) => void;
}) {
  const t = useTheme();
  const { active, idle } = weekPrinters(agenda);
  return (
    <>
      <Card style={{ gap: 10, padding: 12 }}>
        <View style={{ flexDirection: "row", gap: 4 }}>
          {days.map((day) => (
            <Pressable key={day} accessibilityRole="button" accessibilityLabel={`Abrir agenda de ${day}`} accessibilityState={{ selected: selectedDay === day }} onPress={() => selectDay(day)} style={{ flex: 1, alignItems: "center", gap: 3 }}>
              <Text style={{ color: t.muted, fontSize: 10 }}>{weekday(day)[0].toUpperCase()}</Text>
              <Text style={{ textAlign: "center", lineHeight: 25, width: 25, height: 25, borderRadius: 13, overflow: "hidden", backgroundColor: day === selectedDay ? t.primary : "transparent", borderWidth: day === today ? 1.5 : 0, borderColor: t.primary, color: day === selectedDay ? t.onPrimary : t.text, fontSize: 13, fontWeight: "700" }}>{day.slice(8)}</Text>
            </Pressable>
          ))}
        </View>
        {active.map((printer) => {
          const totals = days.map((day) => printer.jobs.reduce((sum, job) => sum + durationInDay(job, day), 0));
          const weekTotal = totals.reduce((sum, value) => sum + value, 0);
          return (
            <View key={printer.id} style={{ gap: 5 }}>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: "700", flex: 1 }} numberOfLines={1}>{printer.nome}</Text>
                <Text style={{ color: t.muted, fontSize: 11 }}>{hoursLabel(weekTotal)} na semana</Text>
              </View>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {days.map((day, index) => {
                  const ms = totals[index], hours = ms / 3600000;
                  const background = !ms ? t.background : hours <= 2 ? t.accentTint : hours <= 5 ? t.primary + "35" : t.primary;
                  const foreground = hours > 5 ? t.onPrimary : ms ? t.text : t.muted;
                  return <Pressable key={day} accessibilityRole="button" accessibilityLabel={`${printer.nome}, ${day}, ${hoursLabel(ms)}`} onPress={() => selectDay(day)} style={{ flex: 1, minWidth: 0, minHeight: 35, alignItems: "center", justifyContent: "center", borderRadius: 8, backgroundColor: background, borderWidth: day === today || day === selectedDay ? 1.5 : 0, borderColor: day === today || day === selectedDay ? t.primary : "transparent" }}><Text numberOfLines={1} adjustsFontSizeToFit style={{ color: foreground, fontSize: 11, fontWeight: ms ? "600" : "400" }}>{hoursLabel(ms)}</Text></Pressable>;
                })}
              </View>
            </View>
          );
        })}
        {!active.length && !idle.length && <Body muted>Nenhuma impressora cadastrada.</Body>}
        {idle.length > 0 && <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, paddingTop: 2 }}><Text style={{ color: t.muted, fontSize: 10 }}>Menos</Text>{[t.background, t.accentTint, t.primary + "35", t.primary].map((color, i) => <View key={i} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: color }} />)}<Text style={{ color: t.muted, fontSize: 10 }}>Mais</Text></View>}
        {idle.length > 0 && <View style={{ gap: 3 }}>{idle.map((printer) => <Text key={printer.id} style={{ color: t.muted, fontSize: 11 }}>Impressora sem trabalhos · {printer.nome}</Text>)}</View>}
      </Card>
      <Body muted>Toque num dia para ver a agenda dele. O contorno roxo marca hoje.</Body>
    </>
  );
}
