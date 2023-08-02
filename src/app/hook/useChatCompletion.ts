import {
  ChatCompletionRequestMessageRoleEnum,
  Configuration,
  CreateChatCompletionRequest,
  OpenAIApi,
} from "openai";
import {
  useChatCompletionBDispatchContext,
  useChatCompletionBStateContext,
} from "../context/ChatCompletionBContext";
import {
  useChatCompletionADispatchContext,
  useChatCompletionAStateContext,
} from "../context/ChatCompletionAContext";
import { useAppStateContext } from "../context/AppContext";
import { TalkDispatch, TalkMessage, TalkState } from "../state/TalkState";
import {
  ChatCompletionDispatch,
  ChatCompletionState,
  convertTalkMessageToHumanChatMessage,
} from "../state/ChatCompletionState";
import {
  useTalkDispatchContext,
  useTalkStateContext,
} from "../context/TalkContext";
import { useEffect } from "react";

export function useChatCompletion() {
  const { apiKey } = useAppStateContext();
  const aState = useChatCompletionAStateContext();
  const bState = useChatCompletionBStateContext();
  const aDispatcher = useChatCompletionADispatchContext();
  const bDispatcher = useChatCompletionBDispatchContext();
  const talkDispatcher = useTalkDispatchContext();
  const talkState = useTalkStateContext();

  /**
   * Aが発言する
   * @param talkMessage
   * @returns
   */
  function postChatA(talkMessage: TalkMessage) {
    return postChat(
      talkDispatcher,
      aDispatcher,
      aState,
      apiKey,
      talkMessage,
      talkState
    );
  }

  /**
   * Bが発言する
   * @param talkMessage
   * @returns
   */
  function postChatB(talkMessage: TalkMessage) {
    return postChat(
      talkDispatcher,
      bDispatcher,
      bState,
      apiKey,
      talkMessage,
      talkState
    );
  }

  useEffect(() => {
    const latestMessage = talkState.messages[talkState.messages.length - 1];
    if (!latestMessage || talkState.messages.length >= talkState.talkLimit) {
      return;
    }
    if (latestMessage.userId === aState.userId) {
      // 最後の発言がAの場合はBが発言する
      postChatB(latestMessage);
    } else {
      postChatA(latestMessage);
    }
  }, [talkState.messages.length]);

  return {
    postChatA,
    postChatB,
  };
}

const createChatCompletion = async (
  apiKey: string,
  reqParam: CreateChatCompletionRequest
): Promise<string> => {
  const configuration = new Configuration({
    apiKey,
  });
  const openai = new OpenAIApi(configuration);
  const completion = await openai.createChatCompletion(reqParam);
  if (completion.data.choices[0].message?.content) {
    return completion.data.choices[0].message?.content;
  }
  throw new Error("No message content");
};

async function postChat(
  talkDispatcher: TalkDispatch,
  chatDispatcher: ChatCompletionDispatch,
  state: ChatCompletionState,
  apiKey: string,
  talkMessage: TalkMessage,
  talkState: TalkState
): Promise<void> {
  // 要約する
  const summarizedMessage = await summarizeTalks(
    state,
    [...talkState.messages],
    apiKey
  );
  console.log("summarizedMessage", summarizedMessage);
  const newTalkMessage: TalkMessage = {
    ...talkMessage,
    content: summarizedMessage,
  };

  chatDispatcher.dispatch({
    type: "add-talk-message",
    payload: newTalkMessage,
  });

  try {
    const content = await createChatCompletion(apiKey, {
      model: state.model,
      temperature: state.temperature,
      top_p: state.top_p,
      n: state.n,
      stream: state.stream,
      stop: state.stop,
      max_tokens: state.max_tokens,
      presence_penalty: state.presence_penalty,
      frequency_penalty: state.frequency_penalty,
      logit_bias: state.logit_bias,
      user: state.user,
      messages: [
        // Systemの設定
        ...state.messages.filter(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        ),
        // 相手の発言を要約したもの
        convertTalkMessageToHumanChatMessage(newTalkMessage),
      ],
    });

    chatDispatcher.dispatch({
      type: "add-ai-chat-message",
      payload: content,
    });
    const replyMessage: TalkMessage = {
      userId: state.userId,
      userName: state.userName,
      content,
    };
    talkDispatcher.dispatch({
      type: "add-ai-chat-message",
      payload: replyMessage,
    });
  } catch (e) {
    throw e;
  }
}

const MAX_TEXT_COUNT_TO_SUMMARIZE = 500;

/**
 * 発言を要約する
 * @param state
 * @param messages
 * @param apiKey
 * @returns
 */
async function summarizeTalks(
  state: ChatCompletionState,
  messages: TalkMessage[],
  apiKey: string
): Promise<string> {
  const selfId = state.userId;
  // 相手の発言のみを抽出する
  const joinedMessage = messages
    .filter((msg) => msg.userId !== selfId)
    .map((msg) => msg.content).join(`
`);

  if (joinedMessage.length <= MAX_TEXT_COUNT_TO_SUMMARIZE) {
    return joinedMessage;
  }

  try {
    const content = await createChatCompletion(apiKey, {
      model: state.model,
      temperature: state.temperature,
      top_p: state.top_p,
      n: state.n,
      stream: state.stream,
      stop: state.stop,
      max_tokens: state.max_tokens,
      presence_penalty: state.presence_penalty,
      frequency_penalty: state.frequency_penalty,
      logit_bias: state.logit_bias,
      user: state.user,
      messages: [
        {
          role: ChatCompletionRequestMessageRoleEnum.User,
          content: `次の文章を${MAX_TEXT_COUNT_TO_SUMMARIZE}文字以内で要約してください。:
    
${joinedMessage}`,
        },
      ],
    });
    return content;
  } catch (e) {
    throw e;
  }
}
