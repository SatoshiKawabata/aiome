import { Configuration, CreateChatCompletionRequest, OpenAIApi } from "openai";
import {
  useChatCompletionBDispatchContext,
  useChatCompletionBStateContext,
} from "../context/ChatCompletionBContext";
import {
  useChatCompletionADispatchContext,
  useChatCompletionAStateContext,
} from "../context/ChatCompletionAContext";
import { useAppStateContext } from "../context/AppContext";
import { TalkDispatch, TalkMessage } from "../state/TalkState";
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

  function postChatA(talkMessage: TalkMessage) {
    return postChat(talkDispatcher, aDispatcher, aState, apiKey, talkMessage);
  }

  function postChatB(talkMessage: TalkMessage) {
    return postChat(talkDispatcher, bDispatcher, bState, apiKey, talkMessage);
  }

  useEffect(() => {
    const latestMessage = talkState.messages[talkState.messages.length - 1];
    if (!latestMessage || talkState.messages.length >= talkState.talkLimit) {
      return;
    }
    if (latestMessage.userId === aState.userId) {
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
  talkMessage: TalkMessage
): Promise<void> {
  chatDispatcher.dispatch({
    type: "add-talk-message",
    payload: talkMessage,
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
        ...state.messages,
        convertTalkMessageToHumanChatMessage(talkMessage),
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
