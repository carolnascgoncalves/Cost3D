import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
// Generates the component schemas used by this client directly from OpenAPI.
// No runtime dependency or manually maintained DTOs are needed.
const input =
  process.argv[2] ||
  fileURLToPath(new URL("../src/api/openapi.json", import.meta.url));
const spec = input.startsWith("http")
  ? await (await fetch(input)).json()
  : JSON.parse(await fs.readFile(input, "utf8"));
function type(s) {
  if (!s || Object.keys(s).length === 0) return "unknown";
  if (s.$ref)
    return `components['schemas'][${JSON.stringify(s.$ref.split("/").pop())}]`;
  if (s.enum) return s.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (s.oneOf || s.anyOf) return (s.oneOf || s.anyOf).map(type).join(" | ");
  if (s.allOf) return s.allOf.map(type).join(" & ");
  if (Array.isArray(s.type))
    return s.type.map((t) => type({ ...s, type: t })).join(" | ");
  let result;
  switch (s.type) {
    case "string":
      result = "string";
      break;
    case "integer":
    case "number":
      result = "number";
      break;
    case "boolean":
      result = "boolean";
      break;
    case "null":
      return "null";
    case "array":
      result = `Array<${type(s.items)}>`;
      break;
    default: {
      const fields = Object.entries(s.properties || {}).map(
        ([key, value]) =>
          `${JSON.stringify(key)}${s.required?.includes(key) ? "" : "?"}: ${type(value)};`,
      );
      if (s.additionalProperties)
        fields.push(
          `[key: string]: ${s.additionalProperties === true ? "unknown" : type(s.additionalProperties)};`,
        );
      result = fields.length
        ? `{ ${fields.join(" ")} }`
        : "Record<string, unknown>";
    }
  }
  return s.nullable ? `${result} | null` : result;
}
if (!spec.components?.schemas) throw new Error("Contrato OpenAPI sem schemas.");
const content =
  "/** Generated from OpenAPI by npm run api:generate. Do not edit. */\nexport interface components {\n  schemas: {\n" +
  Object.entries(spec.components.schemas)
    .map(([key, value]) => `    ${JSON.stringify(key)}: ${type(value)};`)
    .join("\n") +
  "\n  };\n}\n";
await fs.writeFile(new URL("../src/api/schema.d.ts", import.meta.url), content);
console.log("Contrato gerado em src/api/schema.d.ts");
