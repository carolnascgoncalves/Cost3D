export function pick3mf(): Promise<FormData | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".3mf";
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (!/\.3mf$/i.test(file.name))
        return reject(new Error("Selecione um arquivo .3mf."));
      if (file.size > 50 * 1024 * 1024)
        return reject(new Error("O arquivo deve ter até 50 MB."));
      const data = new FormData();
      data.append("arquivo3mf", file, file.name);
      resolve(data);
    };
    input.click();
  });
}
