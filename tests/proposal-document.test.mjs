import assert from "node:assert/strict";
import test from "node:test";
import { proposalDocument, proposalMessage } from "../src/features/proposal-document.ts";

test("mensagens usam os totais da proposta e só o WhatsApp recebe negrito", () => {
  const proposal = {
    resumo: { codigo: "0020", cliente: "Ana", total: 45 },
    itens: [{ nome: "Suporte", quantidade: 2, preco: 20 }],
    dados: { frete: 7, observacoes: "Retirada combinada." },
    subtotal: 40, desconto: 2, custo: 11.99, previsao: "2026-12-02T14:30",
  };
  const whatsapp = proposalMessage(proposal, "Loja Exemplo", true);
  const email = proposalMessage(proposal, "Loja Exemplo", false);
  assert.match(whatsapp, /\*Total: R\$\s45,00\*/);
  assert.match(email, /02\/12\/2026 às 14:30/);
  assert.match(email, /Loja Exemplo/);
  assert.match(email, /Desconto: −R\$\s2,00/);
  assert.doesNotMatch(email, /\*|11,99/);
});

test("PDF de várias páginas preserva valores, texto acentuado e referências das páginas", () => {
  const bytes = proposalDocument({
    resumo: { codigo: "#0007", titulo: "Proposta", cliente: "João", total: 400 },
    itens: Array.from({ length: 20 }, () => ({
      nome: "Peça com acabamento ".repeat(6), quantidade: 2, preco: 10,
    })),
    subtotal: 400, desconto: 0, dados: { frete: 0, observacoes: "Embalagem para presente." },
    custo: 373.77,
  });
  const pdf = Buffer.from(bytes).toString("ascii");
  const text = [...pdf.matchAll(/<([0-9a-f]+)> Tj/g)]
    .map((m) => Buffer.from(m[1], "hex").toString("latin1")).join("\n");
  assert.match(text, /João/);
  assert.match(text, /Peça com acabamento/);
  assert.match(text, /Total ao cliente: R\$\s400,00/);
  assert.doesNotMatch(text, /373[.,]77/);
  assert.ok(Number(pdf.match(/\/Count (\d+)/)[1]) > 1);
  const start = Number(pdf.match(/startxref\n(\d+)/)[1]);
  assert.equal(pdf.slice(start, start + 4), "xref");
  [...pdf.slice(start).matchAll(/(\d{10}) 00000 n/g)].forEach((m, i) => {
    assert.ok(pdf.slice(Number(m[1])).startsWith((i + 1) + " 0 obj"));
  });
});
