import { useAuth } from "@/auth/provider";
import { MenuRows, ModuleScreen } from "@/components/module-screen";
export default function More() {
  const { account } = useAuth();
  return (
    <ModuleScreen section="Menu" title="Mais">
      <MenuRows
        entries={
          account?.tenantId
            ? [
                { label: "Clientes", route: "/customers" },
                { label: "Orçamentos e pedidos", site: "/orcamentos" },
                { label: "Outras vendas", site: "/outras-vendas" },
                { label: "Planejar produção", site: "/simulacao" },
                {
                  label: "Meus cálculos",
                  route: {
                    pathname: "/calculate",
                    params: { modo: "historico" },
                  },
                },
                { label: "Movimentações", route: "/movements" },
                { label: "Custos extras", site: "/custos-loja" },
                { label: "Configurações", site: "/configuracao" },
                { label: "Minha conta", route: "/account" },
              ]
            : [{ label: "Minha conta", route: "/account" }]
        }
      />
    </ModuleScreen>
  );
}
