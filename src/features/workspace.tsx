import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
  type Dispatch,
  type SetStateAction,
} from "react";
export type CustomerFilters = {
  busca: string;
  arquivados: boolean;
  pagina: number;
};
export type MovementFilters = {
  busca: string;
  tipo: string;
  direcao: string;
  inicio: string;
  fim: string;
  tudo: boolean;
  saldo: boolean;
  pagina: number;
};
export const defaultCustomers: CustomerFilters = {
  busca: "",
  arquivados: false,
  pagina: 0,
};
export const defaultMovements: MovementFilters = {
  busca: "",
  tipo: "",
  direcao: "",
  inicio: "",
  fim: "",
  tudo: false,
  saldo: false,
  pagina: 0,
};
type State = {
  customers: CustomerFilters;
  setCustomers: Dispatch<SetStateAction<CustomerFilters>>;
  movements: MovementFilters;
  setMovements: Dispatch<SetStateAction<MovementFilters>>;
};
const Context = createContext<State>(null!);
export function WorkspaceProvider({ children }: PropsWithChildren) {
  const [customers, setCustomers] = useState(defaultCustomers);
  const [movements, setMovements] = useState(defaultMovements);
  return (
    <Context.Provider
      value={{ customers, setCustomers, movements, setMovements }}
    >
      {children}
    </Context.Provider>
  );
}
export const useWorkspace = () => useContext(Context);
