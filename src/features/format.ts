// Keep decimal strings precise, including values larger than Number.MAX_SAFE_INTEGER.
export function decimal(value: string | undefined, places = 3) {
  if (!value || !/^-?\d+(\.\d+)?$/.test(value)) return "0";
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace(/^-/, "").split(".");
  const scale = 10n ** BigInt(places);
  let units =
    BigInt(whole) * scale +
    BigInt(fraction.padEnd(places, "0").slice(0, places) || "0");
  if (Number(fraction[places] || 0) >= 5) units++;
  const integer = (units / scale)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const rest = (units % scale)
    .toString()
    .padStart(places, "0")
    .replace(/0+$/, "");
  return (
    (negative && units !== 0n ? "-" : "") + integer + (rest ? "," + rest : "")
  );
}
export function reais(value: string | undefined) {
  if (value == null) return "—";
  const [whole, cents = ""] = decimal(value, 2).split(",");
  return `R$ ${whole},${cents.padEnd(2, "0")}`;
}
export function quantity(
  value: string | undefined,
  measure = "un.",
  signed = false,
) {
  const input = value || "0";
  const negative = input.startsWith("-");
  const absolute = input.replace(/^-/, "");
  const [whole, fraction = ""] = absolute.split(".");
  const grams = measure === "g";
  const kg = grams && /^\d+$/.test(whole) && BigInt(whole) >= 1000n;
  const shifted = kg
    ? `${BigInt(whole) / 1000n}.${(BigInt(whole) % 1000n).toString().padStart(3, "0")}${fraction}`
    : absolute;
  const number = decimal(
    (negative ? "-" : "") + shifted,
    kg ? 2 : grams ? 1 : 3,
  );
  const positive = signed && !negative && /[1-9]/.test(input) ? "+" : "";
  return `${positive}${number} ${kg ? "kg" : measure}`;
}
export function toIsoDate(value: string) {
  if (!value) return "";
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  const iso = match ? `${match[3]}-${match[2]}-${match[1]}` : value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(iso + "T12:00:00Z");
  return !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}
export function dateTime(value: string | undefined) {
  if (!value) return "Data não informada";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Data não informada"
    : new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      }).format(date);
}
export function productionDescription(description = "", type = "") {
  if (type !== "PRODUCAO" && type !== "DESFAZER_PRODUCAO")
    return { title: description, detail: "" };
  const separator = / [–—-] /.exec(description);
  return separator?.index === undefined
    ? { title: description, detail: "" }
    : {
        title: description.slice(0, separator.index),
        detail: description.slice(separator.index + separator[0].length),
      };
}
