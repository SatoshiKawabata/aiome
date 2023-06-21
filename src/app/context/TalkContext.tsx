import { FC, ReactNode, createContext, useContext, useReducer } from "react";
import {
  TalkDispatch,
  TalkState,
  initialState,
  reducer,
} from "../state/TalkState";

const TalkStateContext = createContext<TalkState>(initialState);

const TalkDispatchContext = createContext<TalkDispatch>({
  dispatch: () => {},
});

export const TalkProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <TalkStateContext.Provider value={state}>
      <TalkDispatchContext.Provider value={{ dispatch }}>
        {children}
      </TalkDispatchContext.Provider>
    </TalkStateContext.Provider>
  );
};

export const useTalkStateContext = () => useContext(TalkStateContext);
export const useTalkDispatchContext = () => useContext(TalkDispatchContext);
