import type { Detail } from "./budget-ui";

// PDF text streams use hexadecimal WinAnsi strings so offsets stay byte-exact.
function encoded(text: string) {
  return Array.from(text.normalize("NFC"), (char) => {
    const n = char.codePointAt(0)!;
    const extra: Record<string, number> = {
      "–": 150,
      "—": 151,
      "’": 146,
      "“": 147,
      "”": 148,
      "…": 133,
      "•": 149,
      "€": 128,
    };
    return (extra[char] ?? (n >= 32 && n <= 255 ? n : 63))
      .toString(16)
      .padStart(2, "0");
  }).join("");
}
export function proposalDocument(d: Detail) {
  const currency = (v: number) =>
    Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  const pages: string[][] = [[]];
  let y = 785;
  function line(value: string, size = 12, bold = false) {
    const max = Math.floor(500 / (size * 0.77));
    for (const para of String(value).split(/\r?\n/)) {
      let remaining = para.trim();
      do {
        let cut = max;
        if (remaining.length > max) {
          const space = remaining.lastIndexOf(" ", max);
          if (space > 0) cut = space;
        }
        if (y < 55) {
          pages.push([]);
          y = 785;
        }
        pages[pages.length - 1].push(
          "BT /" +
            (bold ? "B" : "R") +
            " " +
            size +
            " Tf 0.16 0.12 0.22 rg 48 " +
            y +
            " Td <" +
            encoded(remaining.slice(0, cut)) +
            "> Tj ET",
        );
        y -= size + 7;
        remaining = remaining.slice(cut).trimStart();
      } while (remaining.length);
    }
  }
  line("Proposta " + d.resumo.codigo, 22, true);
  line(d.resumo.titulo, 15, true);
  line("Cliente: " + (d.resumo.cliente || "A informar"));
  if (d.resumo.contato) line(d.resumo.contato);
  if (d.resumo.email) line(d.resumo.email);
  if (d.previsao)
    line(
      "Previsão: " +
        d.previsao.slice(0, 10).split("-").reverse().join("/") +
        " às " +
        d.previsao.slice(11, 16),
    );
  y -= 10;
  line("Peças", 14, true);
  for (const item of d.itens) {
    line(item.nome, 12, true);
    line(
      item.quantidade +
        " un. × " +
        currency(item.preco) +
        " = " +
        currency(item.quantidade * item.preco),
    );
  }
  y -= 10;
  line("Peças: " + currency(d.subtotal));
  line("Desconto: " + currency(d.desconto));
  line("Frete: " + currency(d.dados.frete));
  line("Total ao cliente: " + currency(d.resumo.total), 16, true);
  if (d.dados.observacoes) {
    line("Observações", 13, true);
    line(d.dados.observacoes);
  }
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Count " +
      pages.length +
      " /Kids [" +
      pages.map((_, i) => 5 + 2 * i + " 0 R").join(" ") +
      "] >>",
    ...["Helvetica", "Helvetica-Bold"].map(
      (font) =>
        "<< /Type /Font /Subtype /Type1 /BaseFont /" +
        font +
        " /Encoding /WinAnsiEncoding >>",
    ),
  ];
  pages.forEach((commands, i) => {
    const stream = commands.join("\n") + "\n";
    objects.push(
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /R 3 0 R /B 4 0 R >> >> /Contents " +
        (6 + i * 2) +
        " 0 R >>",
      "<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream",
    );
  });
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += i + 1 + " 0 obj\n" + obj + "\nendobj\n";
  });
  const start = pdf.length;
  pdf +=
    "xref\n0 " +
    offsets.length +
    "\n0000000000 65535 f \n" +
    offsets
      .slice(1)
      .map((n) => String(n).padStart(10, "0") + " 00000 n \n")
      .join("") +
    "trailer\n<< /Size " +
    offsets.length +
    " /Root 1 0 R >>\nstartxref\n" +
    start +
    "\n%%EOF\n";
  return Uint8Array.from(pdf, (c) => c.charCodeAt(0));
}
