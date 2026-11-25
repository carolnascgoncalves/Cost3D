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
const currency = (value: number) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const code = (d: Detail) => "#" + d.resumo.codigo.replace(/^#/, "");
const deadline = (value: string) =>
  value.slice(0, 10).split("-").reverse().join("/") +
  " às " +
  value.slice(11, 16);

export function proposalMessage(d: Detail, store: string, whatsapp: boolean) {
  const heading = (text: string) => (whatsapp ? "*" + text + "*" : text);
  const person = d.resumo.cliente?.trim();
  return [
    person ? "Olá, " + person + "!" : "Olá!",
    "Segue a proposta " + code(d) + " de " + store + ".",
    heading("Peças") +
      "\n" +
      d.itens
        .map(
          (item) =>
            "• " +
            item.nome +
            "\n   " +
            item.quantidade +
            " un. × " +
            currency(item.preco) +
            " = " +
            currency(item.quantidade * item.preco),
        )
        .join("\n"),
    [
      "Subtotal das peças: " + currency(d.subtotal),
      d.desconto ? "Desconto: −" + currency(d.desconto) : "",
      "Frete: " + currency(d.dados.frete),
      heading("Total: " + currency(d.resumo.total)),
    ]
      .filter(Boolean)
      .join("\n"),
    d.previsao ? "Previsão de conclusão: " + deadline(d.previsao) : "",
    d.dados.observacoes?.trim()
      ? "Observações: " + d.dados.observacoes.trim()
      : "",
    "Se tiver alguma dúvida ou quiser confirmar o pedido, é só responder por aqui.",
    store,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function proposalDocument(
  d: Detail,
  store = "Cost3D",
  photos: Record<string, string> = {},
) {
  const pages: string[][] = [];
  const pictures: { name: string; hex: string }[] = [];
  let y = 0,
    commands: string[] = [];
  const ink = "0.16 0.12 0.17",
    muted = "0.36 0.32 0.35",
    wine = "0.45 0.12 0.19";
  function box(x: number, bottom: number, w: number, h: number, color: string) {
    commands.push(color + " rg " + [x, bottom, w, h].join(" ") + " re f");
  }
  function text(
    value: string,
    x: number,
    baseline: number,
    size = 11,
    bold = false,
    color = ink,
  ) {
    commands.push(
      "BT /" +
        (bold ? "B" : "R") +
        " " +
        size +
        " Tf " +
        color +
        " rg " +
        x +
        " " +
        baseline +
        " Td <" +
        encoded(value) +
        "> Tj ET",
    );
  }
  function wrap(value: string, limit: number) {
    const lines: string[] = [];
    for (let part of value.split(/\r?\n/)) {
      part = part.trim();
      do {
        const space = part.lastIndexOf(" ", limit);
        const cut = part.length > limit && space > 0 ? space : limit;
        lines.push(part.slice(0, cut));
        part = part.slice(cut).trimStart();
      } while (part.length);
    }
    return lines;
  }
  function page() {
    commands = [];
    pages.push(commands);
    box(0, 755, 595, 87, wine);
    text("PROPOSTA COMERCIAL", 36, 811, 10, true, "1 0.91 0.92");
    text(code(d), 36, 773, 27, true, "1 1 1");
    wrap(store, 28)
      .slice(0, 3)
      .forEach((line, i) => text(line, 350, 804 - 14 * i, 12, true, "1 1 1"));
    y = 729;
  }
  function space(height: number) {
    if (y - height < 58) page();
  }
  function paragraph(value: string, size = 11, bold = false, color = ink) {
    for (const line of wrap(value, Math.floor(530 / (size * 0.78)))) {
      space(size + 7);
      text(line, 36, y, size, bold, color);
      y -= size + 7;
    }
  }
  page();
  if (d.resumo.titulo && d.resumo.titulo !== "Novo orçamento")
    paragraph(d.resumo.titulo, 18, true);
  paragraph("PREPARADA PARA", 9, true, wine);
  paragraph(d.resumo.cliente || "Cliente", 14, true);
  for (const contact of [d.resumo.contato, d.resumo.email])
    if (contact) paragraph(contact, 10, false, muted);
  if (d.previsao)
    paragraph("Previsão de conclusão: " + deadline(d.previsao), 11);
  y -= 10;
  space(110);
  paragraph("Peças da proposta", 15, true);
  for (const item of d.itens) {
    const lines = wrap(item.nome, 44),
      h = Math.max(70, lines.length * 16 + 32);
    space(h);
    box(36, y - h + 5, 523, h - 7, "0.97 0.96 0.96");
    const photo = item.id ? photos[item.id] : undefined;
    const x = photo ? 110 : 48;
    if (photo) {
      const name = "Im" + pictures.length;
      pictures.push({ name, hex: photo });
      commands.push("q 52 0 0 52 46 " + (y - 59) + " cm /" + name + " Do Q");
    }
    lines.forEach((line, i) => text(line, x, y - 20 - i * 16, 12, true));
    text(
      item.quantidade + " un. × " + currency(item.preco),
      x,
      y - 25 - lines.length * 16,
      10,
      false,
      muted,
    );
    text(currency(item.quantidade * item.preco), 451, y - 22, 12, true, wine);
    y -= h;
  }
  space(135);
  y -= 14;
  for (const [label, amount] of [
    ["Peças", d.subtotal],
    ["Desconto", d.desconto],
    ["Frete", d.dados.frete],
  ] as const) {
    text(label, 320, y, 11, false, muted);
    text(currency(amount), 451, y, 11, true);
    y -= 18;
  }
  box(36, y - 28, 523, 36, wine);
  text(
    "Total ao cliente: " + currency(d.resumo.total),
    51,
    y - 15,
    16,
    true,
    "1 1 1",
  );
  y -= 52;
  if (d.dados.observacoes?.trim()) {
    space(44);
    paragraph("Observações", 13, true);
    paragraph(d.dados.observacoes, 11, false, muted);
  }
  pages.forEach((p, i) => {
    commands = p;
    box(36, 40, 523, 1, "0.85 0.82 0.83");
    text("Proposta " + code(d), 36, 24, 9, false, muted);
    text("Página " + (i + 1) + " de " + pages.length, 472, 24, 9, false, muted);
  });
  const imageRefs = pictures
    .map(
      (picture, i) =>
        "/" + picture.name + " " + (5 + 2 * pages.length + i) + " 0 R",
    )
    .join(" ");
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
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << " +
        imageRefs +
        " >> /Font << /R 3 0 R /B 4 0 R >> >> /Contents " +
        (6 + i * 2) +
        " 0 R >>",
      "<< /Length " + stream.length + " >>\nstream\n" + stream + "endstream",
    );
  });
  for (const photo of pictures) {
    const stream = photo.hex + ">";
    objects.push(
      "<< /Type /XObject /Subtype /Image /Width 320 /Height 320 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length " +
        stream.length +
        " >>\nstream\n" +
        stream +
        "\nendstream",
    );
  }
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
