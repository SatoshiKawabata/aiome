"use client";
import { useEffect, useState } from "react";
import {
  useAppDispatchContext,
  useAppStateContext,
} from "../context/AppContext";
import {
  useChatCompletionBDispatchContext,
  useChatCompletionBStateContext,
} from "../context/ChatCompletionBContext";
import {
  useChatCompletionADispatchContext,
  useChatCompletionAStateContext,
} from "../context/ChatCompletionAContext";
import {
  useTalkDispatchContext,
  useTalkStateContext,
} from "../context/TalkContext";
import { useChatCompletion } from "../hook/useChatCompletion";
import { Button, Label, TextInput, Textarea } from "flowbite-react";
import { ChatCompletionRequestMessageRoleEnum } from "openai";
import { getItem, setItem } from "@/util/LocalStorageUtil";

export default function () {
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

  useChatCompletion();

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
      <form
        onSubmit={(e) => {
          e.preventDefault();
          talkDispatcher.dispatch({
            type: "add-ai-chat-message",
            payload: {
              userId: aState.userId,
              userName: aState.userName,
              content: firstContent,
            },
          });
        }}
      >
        <div>
          <Label htmlFor="api-key" value="ChatGPT API key" />
          <TextInput
            id="api-key"
            placeholder="Your ChatGPT API key"
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
          <Label htmlFor="talk-limit" value="Talk limit" />
          <TextInput
            id="talk-limit"
            placeholder="Please write down talk limit"
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
          <Label htmlFor="systemA" value="systemA" />
          <Textarea
            id="systemA"
            placeholder="Please write system of A description here"
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
          <Label htmlFor="systemB" value="systemB" />
          <Textarea
            id="systemB"
            placeholder="Please write system of B description here"
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
        <div>
          <Label htmlFor="firstContent" value="First message" />
          <Textarea
            id="firstContent"
            placeholder="Please write first message of A"
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
        <div>
          <Button type="submit">Post</Button>
        </div>
      </form>
      <ul>
        {talkState.messages.map((message) => {
          return (
            <li>
              {message.userName}: 「{message.content}」
            </li>
          );
        })}
      </ul>
    </>
  );
}
