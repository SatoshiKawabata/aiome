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
      // 会話を終了する前に話題の転換を行う
      const changeTopic = async (
        currentState: ChatCompletionState,
        partnerState: ChatCompletionState
      ) => {
        // 最後の発言がAの場合はAが発言する
        const currentSystem = currentState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const partnerSystem = partnerState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const prompt = `
${talkState.messages
  .map((msg) => {
    return `${msg.userName}「${msg.content}」`;
  })
  .join(`\n`)}
--------
以上の会話をふまえて、以下について答えてください。
・${currentState.userName}の立場は「${currentSystem?.content}」です。
・${partnerState.userName}の立場は「${partnerSystem?.content}」です。

次のステップで考えてください。
1. ${currentState.userName}と${
          partnerState.userName
        }が行ってきた会話で中心となるトピックの転換点を考えてください。
2. その新しいトピックに対して${currentState.userName}と${
          partnerState.userName
        }はそれぞれ賛成と反対に分かれて議論を続けさせたいです。会話の中心となるトピックに対してそれぞれの立場を200文字程度で新しく表現してください。

以下のJSONフォーマットで変数名を変えずに返答してください。
\`\`\`
{
  "${currentState.userName}": "${
          currentState.userName
        }の立場の内容をここに書いてください",
  "${partnerState.userName}": "${
          partnerState.userName
        }の立場の内容をここに書いてください"
}
  \`\`\`
          `;
        const res = await createChatCompletion(apiKey, {
          // TODO: ここはどちらでもないAI用の値を入れていく
          model: currentState.model,
          temperature: currentState.temperature,
          top_p: currentState.top_p,
          n: currentState.n,
          stream: currentState.stream,
          stop: currentState.stop,
          max_tokens: currentState.max_tokens,
          presence_penalty: currentState.presence_penalty,
          frequency_penalty: currentState.frequency_penalty,
          logit_bias: currentState.logit_bias,
          messages: [
            {
              content: prompt,
              role: ChatCompletionRequestMessageRoleEnum.User,
            },
          ],
        });
        return JSON.parse(res);
      };
      (async () => {
        const res = await changeTopic(aState, bState);
        console.log("res", res);
        // ここでSystemを書き換える;
        aDispatcher.dispatch({
          type: "set-system-chat-message",
          payload: `あなたの立場は「${
            res[aState.userName]
          }」です。男っぽい口調で話してください。`,
        });
        bDispatcher.dispatch({
          type: "set-system-chat-message",
          payload: `あなたの立場は「${
            res[bState.userName]
          }」です。女っぽい口調で話してください。`,
        });
      })();
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
      // ゲストの発言の場合
      // 最新のゲストの発言をつなげる
      const reversed = [...talkState.messages].reverse();
      const index = reversed.findIndex(
        (msg) => msg.userId === aState.userId || msg.userId === bState.userId
      );
      const latestHumanMessages = reversed.slice(0, index).reverse();
      const latestHumanMessage = latestHumanMessages
        .map((msg) => msg.content)
        .join("\n");
      const latestAiMessage = reversed[index];
      if (latestAiMessage.userId === aState.userId) {
        // 最後の発言がAの場合はAが発言する
        const aSystem = aState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const bSystem = bState.messages.find(
          (msg) => msg.role === ChatCompletionRequestMessageRoleEnum.System
        );
        const prompt = `・あなたの立場は「${aSystem?.content}」です。
・${bState.userName}の立場は「${bSystem?.content}」です。
それをふまえて、ゲストの発言「${latestHumanMessage}」があなたの立場と${bState.userName}の立場のどちらに近いですか？
あなたに近い場合は、ゲストの発言をふまえた上で${bState.userName}に対して反論を行ってください。
${bState.userName}に近い場合は、ゲストに対して反論を行ってください。

以下のJSONフォーマットでtargetとcontentという変数名を変えずに返答してください。反論する相手の名前をtargetに入れてください。
\`\`\`
{
  "target": "${bState.userName}" or "ゲスト",
  "content": "あなたの返信内容"
}
\`\`\`
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
        const prompt = `・あなたの立場は「${bSystem?.content}」です。
・${aState.userName}の立場は「${aSystem?.content}」です。
以上をふまえて、ゲストの発言「${latestHumanMessage}」があなたの立場と${aState.userName}の立場のどちらに近いですか？
あなたに近い場合は、ゲストの発言をふまえた上で${aState.userName}に対して反論を行ってください。
${aState.userName}に近い場合は、ゲストに対して反論を行ってください。

以下のJSONフォーマットでtargetとcontentという変数名を変えずに返答してください。反論する相手の名前をtargetに入れてください。
\`\`\`
{
  "target": "${aState.userName}" or "ゲスト",
  "content": "あなたの返信内容"
}
\`\`\`
        `;
        // promptをChatGPTに投げる
        const msg: ChatCompletionRequestMessage = {
          content: prompt,
          role: "user",
        };
        postChatFromHuman(talkDispatcher, bDispatcher, bState, apiKey, msg);
      }

      // ゲストが「〇〇」と言っている
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
        // ゲストの発言からChatGPTに投げるプロンプト
        humanMsg,
      ],
    });

    let obj;
    try {
      obj = JSON.parse(res);
    } catch (e) {
      obj = {
        target: res.includes("ゲスト") ? "ゲスト" : "",
        content: res,
      };
    }
    const content = `${obj.content}`;

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

    if (obj.target === "ゲスト") {
      // ゲストに向けて返答してきた場合
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

    let obj;
    try {
      obj = JSON.parse(res);
    } catch (e) {
      obj = {
        target: res.includes("ゲスト") ? "ゲスト" : "",
        content: res,
      };
    }
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
