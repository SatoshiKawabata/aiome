export interface TalkState {
  messages: TalkMessage[];
  talkLimit: number;
}

export interface TalkMessage {
  userId: number;
  userName: string;
  content: string;
}

export const initialState: TalkState = {
  messages: [],
  talkLimit: 10,
};

type TalkAction =
  | {
      type: "add-ai-chat-message";
      payload: {
        userId: number;
        userName: string;
        content: string;
      };
    }
  | {
      type: "set-talk-limit";
      payload: {
        talkLimit: number;
      };
    };

export type TalkDispatch = {
  dispatch: React.Dispatch<TalkAction>;
};

export const reducer: React.Reducer<TalkState, TalkAction> = (
  state,
  action
) => {
  switch (action.type) {
    case "add-ai-chat-message":
      const newMessage: TalkMessage = {
        userId: action.payload.userId,
        userName: action.payload.userName,
        content: convertAIChatMessageToTalkMessage(action.payload.content),
      };
      return {
        ...state,
        messages: [...state.messages, newMessage],
      };
    case "set-talk-limit":
      return {
        ...state,
        talkLimit: action.payload.talkLimit,
      };
    default:
      return state;
  }
};

const convertAIChatMessageToTalkMessage = (chatContent: string): string => {
  if (chatContent.includes("「") && chatContent.includes("」")) {
    return chatContent.split("「")[1].split("」")[0];
  }
  return chatContent;
};
