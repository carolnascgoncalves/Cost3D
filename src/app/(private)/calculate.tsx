import { MenuRows, ModuleScreen } from "@/components/module-screen";
export default function Calculate() {
  return (
    <ModuleScreen section="Cost3D" title="Novo cálculo">
      <MenuRows
        entries={[
          { label: "Calcular e salvar", site: "/historico/novo" },
          { label: "Consulta sem salvar", site: "/calculo-rapido" },
          { label: "Meus cálculos", site: "/historico/listar" },
        ]}
      />
    </ModuleScreen>
  );
}
