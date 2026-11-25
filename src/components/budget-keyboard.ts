import { createContext } from "react";

// The shell and the wizard must hide their actions in the same render on Android.
export const BudgetKeyboard = createContext({
  active: false,
  hidesFooter: false,
  onFieldFocus: () => {},
});
