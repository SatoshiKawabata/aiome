export const HUMAN_USER_ID = 99999;

export interface TalkState {
  messages: TalkMessage[];
  talkLimit: number;
  // 今の会話を開始したときのメッセージの数
  currentTalkStartCount: number;
  // AIが会話中かどうか
  isAiTalking: boolean;
}

export interface TalkMessage {
  userId: number;
  userName: string;
  content: string;
}

export const initialState: TalkState = {
  messages: [],
  talkLimit: 10,
  currentTalkStartCount: 0,
  isAiTalking: false,
};

type TalkAction =
  | {
      type: "start-ai-talk";
      payload: {
        userId: number;
        userName: string;
        content: string;
      };
    }
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
    }
  | {
      type: "finish-ai-talking";
    }
  | {
      type: "restart-ai-talking";
    }
  | {
      type: "add-human-chat-message";
      payload: {
        content: string;
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
    case "start-ai-talk":
      const initialMessage: TalkMessage = {
        userId: action.payload.userId,
        userName: action.payload.userName,
        content: convertAIChatMessageToTalkMessage(action.payload.content),
      };
      return {
        ...state,
        messages: [...state.messages, initialMessage],
        isAiTalking: true,
        currentTalkStartCount: state.messages.length,
      };
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
    case "finish-ai-talking":
      return {
        ...state,
        isAiTalking: false,
      };
    case "restart-ai-talking":
      return {
        ...state,
        isAiTalking: true,
        currentTalkStartCount: state.messages.length,
      };
    case "add-human-chat-message":
      const humanMessage: TalkMessage = {
        userId: HUMAN_USER_ID,
        userName: "あなた",
        content: convertAIChatMessageToTalkMessage(action.payload.content),
      };
      return {
        ...state,
        isAiTalking: true,
        currentTalkStartCount: state.messages.length,
        messages: [...state.messages, humanMessage],
      };
    default:
      return state;
  }
};

const convertAIChatMessageToTalkMessage = (chatContent: string): string => {
  if (chatContent.includes("「") && chatContent.includes("」")) {
    const startBrackets = chatContent.split("「");
    const last = startBrackets[startBrackets.length - 1];
    return last.split("」")[0];
  }
  return chatContent;
};
