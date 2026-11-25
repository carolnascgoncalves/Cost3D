export function formatHourInput(input: string, previous: string | null) {
  // Remove the leading zero inserted for a one-digit hour when typing continues.
  let digits = input.replace(/\D/g, "");
  if (
    previous?.startsWith("0") &&
    digits.length === 5 &&
    input.startsWith(previous)
  ) {
    digits = digits.slice(1);
  }
  digits = digits.slice(0, 4);
  if (digits.length < 3) {
    const display =
      digits.length === 2 && Number(digits) > 23
        ? digits[0] + ":" + digits[1]
        : digits;
    return { display, value: "" };
  }
  const padded = digits.padStart(4, "0");
  const valid = Number(padded.slice(0, 2)) < 24 && Number(padded.slice(2)) < 60;
  if (digits.length === 3 && (digits.startsWith("0") || !valid)) {
    return { display: digits.slice(0, 2) + ":" + digits[2], value: "" };
  }
  const display = padded.slice(0, 2) + ":" + padded.slice(2);
  return { display, value: valid ? display : "" };
}
