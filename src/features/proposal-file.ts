import { toByteArray } from "base64-js";
import { request } from "@/api/session";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { proposalDocument } from "./proposal-document";
import type { Detail } from "./budget-ui";

export async function openProposal(proposal: Detail, store: string) {
  const name =
    "Proposta-" + proposal.resumo.codigo.replace(/[^a-z0-9-]/gi, "") + ".pdf";
  const photos: Record<string, string> = {};
  for (const item of proposal.itens) {
    if (!item.id) continue;
    const thumbnail = await request<{ base64: string } | undefined>(
      "/orcamentos/itens/" + encodeURIComponent(item.id) + "/miniatura",
    );
    if (thumbnail?.base64)
      photos[item.id] = Array.from(toByteArray(thumbnail.base64), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
  }
  const bytes = proposalDocument(proposal, store, photos);
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([bytes], { type: "application/pdf" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const file = new File(Paths.cache, name);
  file.create({ overwrite: true });
  file.write(bytes);
  if (await file.canPreview({ mimeType: "application/pdf" })) {
    await file.preview({ mimeType: "application/pdf", title: name });
    return;
  }
  const folder = await Directory.pickDirectoryAsync();
  folder.createFile(name, "application/pdf").write(bytes);
}
