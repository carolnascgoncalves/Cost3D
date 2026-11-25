export type Job = {
  id: string;
  loteId: string;
  pedidoId?: string;
  impressoraId: string;
  impressora: string;
  nome: string;
  inicio: string;
  fim: string;
};
export type Agenda = {
  inicio: string;
  impressoras: { id: string; nome: string }[];
  trabalhos: Job[];
};
const dayMs = 86400000;
export function addDays(day: string, count: number) {
  return new Date(Date.parse(day + "T00:00:00Z") + count * dayMs)
    .toISOString()
    .slice(0, 10);
}
export function dateLabel(day: string) {
  return day.slice(8, 10) + "/" + day.slice(5, 7);
}
export function clock(stamp: string) {
  return stamp.slice(11, 16);
}
export function weekday(day: string) {
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"][
    new Date(day + "T00:00:00Z").getUTCDay()
  ];
}
export function localNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const part = (name: string) => parts.find((p) => p.type === name)?.value;
  return (
    part("year") +
    "-" +
    part("month") +
    "-" +
    part("day") +
    "T" +
    part("hour") +
    ":" +
    part("minute") +
    ":" +
    part("second")
  );
}
function stampMs(stamp: string) {
  return Date.parse(stamp.slice(0, 23) + "Z");
}
export function overlaps(job: Job, day: string) {
  return (
    stampMs(job.inicio) < stampMs(addDays(day, 1) + "T00:00:00") &&
    stampMs(job.fim) > stampMs(day + "T00:00:00")
  );
}
export function dayNumber(stamp: string) {
  return Math.floor(Date.parse(stamp.slice(0, 10) + "T00:00:00Z") / dayMs);
}
export function lastDay(job: Job) {
  return new Date(stampMs(job.fim) - 1).toISOString().slice(0, 10);
}
export function barRange(job: Job, start: string) {
  const begin = Date.parse(start + "T00:00:00Z");
  const fraction = (s: string) =>
    Math.max(0, Math.min(1, (stampMs(s) - begin) / (7 * dayMs)));
  return { left: fraction(job.inicio), right: fraction(job.fim) };
}

export function weekPrinters(agenda: Agenda) {
  const groups = new Map<string, { id: string; nome: string; jobs: Job[] }>();
  for (const printer of agenda.impressoras)
    groups.set(printer.id, { ...printer, jobs: [] });
  for (const job of agenda.trabalhos) {
    let group = groups.get(job.impressoraId);
    if (!group) {
      group = { id: job.impressoraId, nome: job.impressora, jobs: [] };
      groups.set(group.id, group);
    }
    group.jobs.push(job);
  }
  const printers = [...groups.values()];
  return {
    active: printers.filter((p) => p.jobs.length),
    idle: printers.filter((p) => !p.jobs.length),
  };
}
