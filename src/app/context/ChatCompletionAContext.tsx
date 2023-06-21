import { FC, ReactNode, createContext, useContext, useReducer } from "react";
import {
  ChatCompletionDispatch,
  ChatCompletionState,
  initialState,
  reducer,
} from "../state/ChatCompletionState";

const ChatCompletionAStateContext =
  createContext<ChatCompletionState>(initialState);

const ChatCompletionADispatchContext = createContext<ChatCompletionDispatch>({
  dispatch: () => {},
});

export const ChatCompletionAProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, {
    ...initialState,
    userId: 1,
    userName: "AI_1",
  });

  return (
    <ChatCompletionAStateContext.Provider value={state}>
      <ChatCompletionADispatchContext.Provider value={{ dispatch }}>
        {children}
      </ChatCompletionADispatchContext.Provider>
    </ChatCompletionAStateContext.Provider>
  );
};

export const useChatCompletionAStateContext = () =>
  useContext(ChatCompletionAStateContext);
export const useChatCompletionADispatchContext = () =>
  useContext(ChatCompletionADispatchContext);
