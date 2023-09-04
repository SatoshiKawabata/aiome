import { useEffect, useState } from "react";
import {
  useAppDispatchContext,
  useAppStateContext,
} from "./context/AppContext";
import {
  useChatCompletionBDispatchContext,
  useChatCompletionBStateContext,
} from "./context/ChatCompletionBContext";
import {
  useChatCompletionADispatchContext,
  useChatCompletionAStateContext,
} from "./context/ChatCompletionAContext";
import {
  useTalkDispatchContext,
  useTalkStateContext,
} from "./context/TalkContext";
import { useChatCompletion } from "./hook/useChatCompletion";
import { Button, Label, TextInput, Textarea } from "flowbite-react";
import { ChatCompletionRequestMessageRoleEnum } from "openai";
import { getItem, setItem } from "@/util/LocalStorageUtil";

export default function Talk() {
  const appDispatcher = useAppDispatchContext();
  const appState = useAppStateContext();
  const aState = useChatCompletionAStateContext();
  const bState = useChatCompletionBStateContext();
  const aDispatcher = useChatCompletionADispatchContext();
  const bDispatcher = useChatCompletionBDispatchContext();
  const talkState = useTalkStateContext();
  const talkDispatcher = useTalkDispatchContext();
  const [firstContent, setFirstContent] = useState("");
  console.log("appState", appState);
  console.log("aState", aState);
  console.log("bState", bState);
  console.log("talkState", talkState);

  const { continueAITalk } = useChatCompletion();
  const [humanMessage, setHumanMessage] = useState("");

  useEffect(() => {
    const apiKey = getItem("apiKey");
    if (apiKey) {
      appDispatcher.dispatch({
        type: "set-api-key",
        payload: { apiKey },
      });
    }

    const talkLimit = getItem("talkLimit");
    if (Number(talkLimit)) {
      talkDispatcher.dispatch({
        type: "set-talk-limit",
        payload: { talkLimit: Number(talkLimit) },
      });
    }

    const systemA = getItem("systemA");
    if (systemA) {
      aDispatcher.dispatch({
        type: "set-system-chat-message",
        payload: systemA,
        // "あなたは関西人のことが嫌いな江戸っ子として振る舞ってください。方言は江戸っ子の言葉で話してください。",
      });
    }

    const systemB = getItem("systemB");
    if (systemB) {
      bDispatcher.dispatch({
        type: "set-system-chat-message",
        payload: systemB,
        // "あなたは江戸っ子のことが嫌いな関西人として振る舞ってください。方言は関西弁で話してください。",
      });
    }

    const firstContentFromLS = getItem("firstContent");
    if (firstContentFromLS) {
      setFirstContent(firstContentFromLS);
    }
  }, []);

  return (
    <>
      <form>
        <div>
          <Label htmlFor="api-key" value="ChatGPT API key" />
          <TextInput
            id="api-key"
            placeholder="ChatGPT API keyを入力してください"
            required
            type="password"
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              appDispatcher.dispatch({
                type: "set-api-key",
                payload: { apiKey: value },
              });
              setItem("apiKey", value);
            }}
            value={appState.apiKey}
          />
        </div>
        <div>
          <Label htmlFor="talk-limit" value="会話の生成回数" />
          <TextInput
            id="talk-limit"
            placeholder="会話の生成回数を入力してください"
            required
            type="number"
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              talkDispatcher.dispatch({
                type: "set-talk-limit",
                payload: { talkLimit: Number(value) },
              });
              setItem("talkLimit", value);
            }}
            value={talkState.talkLimit}
          />
        </div>
        <div>
          <Label htmlFor="systemA" value="AI_1のsystem" />
          <Textarea
            id="systemA"
            placeholder="AI_1のsystemを入力してください"
            required
            rows={4}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              aDispatcher.dispatch({
                type: "set-system-chat-message",
                payload: value,
              });
              setItem("systemA", value);
            }}
            value={
              aState.messages.find(
                (m) => m.role === ChatCompletionRequestMessageRoleEnum.System
              )?.content
            }
          />
        </div>
        <div>
          <Label htmlFor="systemB" value="AI_2のsystem" />
          <Textarea
            id="systemB"
            placeholder="AI_2のsystemを入力してください"
            required
            rows={4}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              bDispatcher.dispatch({
                type: "set-system-chat-message",
                payload: value,
              });
              setItem("systemB", value);
            }}
            value={
              bState.messages.find(
                (m) => m.role === ChatCompletionRequestMessageRoleEnum.System
              )?.content
            }
          />
        </div>
        {talkState.messages.length === 0 && (
          <div>
            <Label htmlFor="firstContent" value="AI_1の最初の発言" />
            <Textarea
              id="firstContent"
              placeholder="AI_1の最初の発言を入力してください"
              required
              rows={4}
              onInput={(e) => {
                const value = (e.target as HTMLInputElement).value;
                setItem("firstContent", value);
                setFirstContent(value);
              }}
              value={firstContent}
            />
          </div>
        )}
        <div>
          {talkState.messages.length === 0 ? (
            <Button
              type="button"
              disabled={talkState.isAiTalking}
              onClick={() => {
                talkDispatcher.dispatch({
                  type: "start-ai-talk",
                  payload: {
                    userId: aState.userId,
                    userName: aState.userName,
                    content: firstContent,
                  },
                });
              }}
            >
              会話を開始する
            </Button>
          ) : (
            <Button
              type="button"
              disabled={talkState.isAiTalking}
              onClick={() => {
                // 会話を再開する
                continueAITalk();
              }}
            >
              会話を再開する
            </Button>
          )}
        </div>
      </form>
      <ul>
        {talkState.messages.map((message, index) => {
          return (
            <li key={index}>
              {message.userName}: 「{message.content}」
            </li>
          );
        })}
      </ul>
      {!talkState.isAiTalking && talkState.messages.length > 0 && (
        <div className="flex">
          <Button
            type="button"
            onClick={() => {
              // 人間の発言を追加する
              talkDispatcher.dispatch({
                type: "add-human-chat-message",
                payload: {
                  content: humanMessage,
                },
              });
            }}
          >
            人間として発言する
          </Button>
          <TextInput
            className="flex-grow"
            value={humanMessage}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              setHumanMessage(value);
            }}
            placeholder="人間としての発言内容を入力してください"
          />
        </div>
      )}
    </>
  );
}
