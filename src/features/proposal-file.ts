import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { proposalDocument } from "./proposal-document";
import type { Detail } from "./budget-ui";

export async function openProposal(proposal: Detail) {
  const name =
    "Proposta-" + proposal.resumo.codigo.replace(/[^a-z0-9-]/gi, "") + ".pdf";
  const bytes = proposalDocument(proposal);
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
