import { FC, ReactNode, createContext, useContext, useReducer } from "react";
import {
  ChatCompletionDispatch,
  ChatCompletionState,
  initialState,
  reducer,
} from "../state/ChatCompletionState";

const ChatCompletionBStateContext =
  createContext<ChatCompletionState>(initialState);

const ChatCompletionBDispatchContext = createContext<ChatCompletionDispatch>({
  dispatch: () => {},
});

export const ChatCompletionBProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    userId: 2,
    userName: "AI_2",
  });

  return (
    <ChatCompletionBStateContext.Provider value={state}>
      <ChatCompletionBDispatchContext.Provider value={{ dispatch }}>
        {children}
      </ChatCompletionBDispatchContext.Provider>
    </ChatCompletionBStateContext.Provider>
  );
};

export const useChatCompletionBStateContext = () =>
  useContext(ChatCompletionBStateContext);
export const useChatCompletionBDispatchContext = () =>
  useContext(ChatCompletionBDispatchContext);
