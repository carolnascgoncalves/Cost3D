export function pick3mf(): Promise<FormData | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".3mf";
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const data = new FormData();
      data.append("arquivo3mf", file, file.name);
      resolve(data);
    };
    input.click();
  });
}
