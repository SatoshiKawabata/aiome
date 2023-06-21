import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
  CreateChatCompletionRequest,
} from "openai";
import { TalkMessage } from "./TalkState";

export type ChatCompletionState = CreateChatCompletionRequest & {
  userId: number;
  userName: string;
};

export const initialState: ChatCompletionState = {
  model: "gpt-3.5-turbo",
  messages: [],
  userId: -1,
  userName: "",
};

type ChatCompletionAction =
  | {
      type: "initialize";
      payload: ChatCompletionState;
    }
  | {
      type: "set-system-chat-message";
      payload: string;
    }
  | {
      type: "add-ai-chat-message";
      payload: string;
    }
  | {
      type: "add-talk-message";
      payload: TalkMessage;
    };

export type ChatCompletionDispatch = {
  dispatch: React.Dispatch<ChatCompletionAction>;
};

export const reducer: React.Reducer<
  ChatCompletionState,
  ChatCompletionAction
> = (state, action) => {
  switch (action.type) {
    case "initialize":
      return initialState;
    case "set-system-chat-message":
      const newMessages = state.messages.filter(
        (message) =>
          message.role !== ChatCompletionRequestMessageRoleEnum.System
      );
      const systemMessage: ChatCompletionRequestMessage = {
        role: ChatCompletionRequestMessageRoleEnum.System,
        content: action.payload,
      };
      return {
        ...state,
        messages: [systemMessage, ...newMessages],
      };
    case "add-talk-message":
      return {
        ...state,
        messages: [
          ...state.messages,
          convertTalkMessageToHumanChatMessage(action.payload),
        ],
      };
    case "add-ai-chat-message":
      return {
        ...state,
        messages: [
          ...state.messages,
          {
            role: ChatCompletionRequestMessageRoleEnum.Assistant,
            content: action.payload,
          },
        ],
      };
    default:
      throw new Error();
  }
};

export const convertTalkMessageToHumanChatMessage = (
  talkMessage: TalkMessage
): ChatCompletionRequestMessage => {
  return {
    role: ChatCompletionRequestMessageRoleEnum.User,
    content: `
${talkMessage.userName}さんが
「${talkMessage.content}」と言っています。
それに対する返答を鉤括弧付きで書いてください。
    `,
    name: talkMessage.userName,
  };
};