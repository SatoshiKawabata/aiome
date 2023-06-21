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
import { TalkMessage } from "../state/TalkState";
import { convertTalkMessageToHumanChatMessage } from "../state/ChatCompletionState";
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

  async function postChatA(talkMessage: TalkMessage) {
    aDispatcher.dispatch({
      type: "add-talk-message",
      payload: talkMessage,
    });

    try {
      const content = await createChatCompletion(apiKey, {
        model: aState.model,
        temperature: aState.temperature,
        top_p: aState.top_p,
        n: aState.n,
        stream: aState.stream,
        stop: aState.stop,
        max_tokens: aState.max_tokens,
        presence_penalty: aState.presence_penalty,
        frequency_penalty: aState.frequency_penalty,
        logit_bias: aState.logit_bias,
        user: aState.user,
        messages: [
          ...aState.messages,
          convertTalkMessageToHumanChatMessage(talkMessage),
        ],
      });

      aDispatcher.dispatch({
        type: "add-ai-chat-message",
        payload: content,
      });
      const replyMessage: TalkMessage = {
        userId: aState.userId,
        userName: aState.userName,
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

  async function postChatB(talkMessage: TalkMessage) {
    bDispatcher.dispatch({
      type: "add-talk-message",
      payload: talkMessage,
    });

    try {
      const content = await createChatCompletion(apiKey, {
        model: bState.model,
        temperature: bState.temperature,
        top_p: bState.top_p,
        n: bState.n,
        stream: bState.stream,
        stop: bState.stop,
        max_tokens: bState.max_tokens,
        presence_penalty: bState.presence_penalty,
        frequency_penalty: bState.frequency_penalty,
        logit_bias: bState.logit_bias,
        user: bState.user,
        messages: [
          ...bState.messages,
          convertTalkMessageToHumanChatMessage(talkMessage),
        ],
      });

      bDispatcher.dispatch({
        type: "add-ai-chat-message",
        payload: content,
      });
      talkDispatcher.dispatch({
        type: "add-ai-chat-message",
        payload: {
          userId: bState.userId,
          userName: bState.userName,
          content,
        },
      });
    } catch (e) {
      throw e;
    }
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
