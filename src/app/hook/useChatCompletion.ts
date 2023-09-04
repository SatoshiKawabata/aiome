import {
  ChatCompletionRequestMessage,
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
/**
 * 連続でリミットまで会話させられるようにする
 *
 */

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
    // 会話を継続するかどうかの判定
    if (
      !latestMessage ||
      talkState.messages.length - talkState.currentTalkStartCount >=
        talkState.talkLimit
    ) {
      // 会話を終了する
      talkDispatcher.dispatch({
        type: "finish-ai-talking",
      });
      return;
    }
    // 会話を継続する
    if (latestMessage.userId === aState.userId) {
      // 最後の発言がAの場合はBが発言する
      postChatB(latestMessage);
    } else if (latestMessage.userId === bState.userId) {
      // 最後の発言がBの場合はAが発言する
      postChatA(latestMessage);
    } else {
      // 人間の発言の場合
      // 最新の人間の発言をつなげる
      const reversed = [...talkState.messages].reverse();
      const index = reversed.findIndex(
        (msg) => msg.userId === aState.userId || msg.userId === bState.userId
      );
      const latestHumanMessages = reversed.slice(0, index).reverse();
      const latestHumanMessage = latestHumanMessages.join("\n");
      const latestAiMessage = reversed[index];
      if (latestAiMessage.userId === aState.userId) {
        // 最後の発言がAの場合はAが発言する
        const aSystem = aState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const bSystem = bState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const prompt = `あなたの立場は「${aSystem}」です。${bState.userName}の立場は「${bSystem}」です。
        それをふまえて、人間の発言「${latestHumanMessage}」があなたの立場と${bState.userName}の立場のどちらに近いですか？
        あなたに近い場合は、人間の発言をふまえた上で${bState.userName}に対して反論を行ってください。
        ${bState.userName}に近い場合は、人間に対して反論を行ってください。
        次のフォーマットで返信してください。
        {
          反論する相手: ${bState.userName} or "人間",
          反論する内容: "〇〇"
        }
        `;
        // promptをChatGPTに投げる
        const msg: ChatCompletionRequestMessage = {
          content: prompt,
          role: "user",
        };
        postChatFromHuman(talkDispatcher, aDispatcher, aState, apiKey, msg);
      } else {
        // 最後の発言がBの場合はBが発言する
        const aSystem = aState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const bSystem = bState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const prompt = `あなたの立場は「${bSystem}」です。${aState.userName}の立場は「${aSystem}」です。
        それをふまえて、人間の発言「${latestHumanMessage}」があなたの立場と${aState.userName}の立場のどちらに近いですか？
        あなたに近い場合は、人間の発言をふまえた上で${aState.userName}に対して反論を行ってください。
        ${aState.userName}に近い場合は、人間に対して反論を行ってください。
        次のJSONフォーマットで返信してください。
        {
          target: ${aState.userName} or "人間",
          content: "〇〇"
        }
        `;
        // promptをChatGPTに投げる
        const msg: ChatCompletionRequestMessage = {
          content: prompt,
          role: "user",
        };
        postChatFromHuman(talkDispatcher, bDispatcher, bState, apiKey, msg);
      }

      // 人間が「〇〇」と言っている
      // AI1の立場とAI2の立場、どちらに近いですかを答えつつ、返答をください。
    }
  }, [talkState.messages.length]);

  function continueAITalk() {
    // 会話を再開する
    talkDispatcher.dispatch({
      type: "restart-ai-talking",
    });
    const latestMessage = talkState.messages[talkState.messages.length - 1];
    if (latestMessage.userId === aState.userId) {
      // 最後の発言がAの場合はBが発言する
      postChatB(latestMessage);
    } else {
      postChatA(latestMessage);
    }
  }

  return {
    postChatA,
    postChatB,
    continueAITalk,
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

async function postChatFromHuman(
  talkDispatcher: TalkDispatch,
  chatDispatcher: ChatCompletionDispatch,
  state: ChatCompletionState,
  apiKey: string,
  humanMsg: ChatCompletionRequestMessage
) {
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
        // 人間の発言からChatGPTに投げるプロンプト
        humanMsg,
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

    const obj = JSON.parse(content);
    if (obj.target === "人間") {
      // 人間に向けて返答してきた場合
      // テキスト入力inputを出す
    } else {
      // もう一方のAIに向けて返答してきた場合
      // AI同士の会話を再開する
      talkDispatcher.dispatch({
        type: "restart-ai-talking",
      });
    }
  } catch (e) {
    throw e;
  }
}

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
    const res = await createChatCompletion(apiKey, {
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

    const obj = JSON.parse(res);
    const { target, content } = obj;

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
