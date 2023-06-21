import { FC, ReactNode, createContext, useContext, useReducer } from "react";
import {
  AppDispatch,
  AppState,
  initialState,
  reducer,
} from "../state/AppState";

const AppStateContext = createContext<AppState>(initialState);

const AppDispatchContext = createContext<AppDispatch>({
  dispatch: () => {},
});

export const AppProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <AppStateContext.Provider value={state}>
      <AppDispatchContext.Provider value={{ dispatch }}>
        {children}
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

export const useAppStateContext = () => useContext(AppStateContext);
export const useAppDispatchContext = () => useContext(AppDispatchContext);
