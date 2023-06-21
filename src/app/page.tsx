"use client";
import { useEffect, useState } from "react";
import { Button, Label, TextInput, Textarea } from "flowbite-react";
import axios from "axios";
import {
  ChatCompletionRequestMessageRoleEnum,
  CreateChatCompletionResponse,
} from "openai/dist/api";
import { PostApiParams } from "./model/Model";

export default function Home() {
  const [apiParams, setApiParams] = useState<PostApiParams>({
    apiKey: "",
    createChatCompletionRequest: {
      model: "gpt-3.5-turbo",
      messages: [],
      temperature: 0.3,
      max_tokens: 500,
    },
  });

  useEffect(() => {
    const apiKey = localStorage.getItem("apiKey") || "";
    setApiParams({
      apiKey,
      createChatCompletionRequest: {
        ...apiParams.createChatCompletionRequest,
      },
    });
  }, []);

  return (
    <main className="p-8">
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          console.log("post", e);
          const res = await axios.post<
            void,
            CreateChatCompletionResponse,
            PostApiParams
          >("api/lang_chain/post", apiParams);
          console.log("res", res);
          localStorage.setItem("apiKey", apiParams.apiKey);
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
              setApiParams({
                apiKey: value,
                createChatCompletionRequest: {
                  ...apiParams.createChatCompletionRequest,
                },
              });
            }}
            value={apiParams.apiKey}
          />
        </div>
        <div>
          <Label htmlFor="system" value="system" />
          <Textarea
            id="system"
            placeholder="Please write system description here"
            required
            rows={4}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;

              const systemMessageIndex =
                apiParams.createChatCompletionRequest.messages.findIndex(
                  (message) =>
                    message.role === ChatCompletionRequestMessageRoleEnum.System
                );
              apiParams.createChatCompletionRequest.messages[
                systemMessageIndex
              ].content = value;

              setApiParams({
                apiKey: apiParams.apiKey,
                createChatCompletionRequest: {
                  ...apiParams.createChatCompletionRequest,
                },
              });
            }}
          />
        </div>
        <div>
          <Label htmlFor="content" value="Content" />
          <Textarea
            id="content"
            placeholder="Please write content to post here"
            required
            rows={4}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              // setContent(value);
            }}
          />
        </div>
        <div>
          <Button type="submit">Post</Button>
        </div>
      </form>
    </main>
  );
}
