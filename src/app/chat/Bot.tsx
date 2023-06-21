import { useEffect, useState } from "react";
import { Button, Label, Textarea } from "flowbite-react";
import {
  ChatCompletionRequestMessage,
  ChatCompletionRequestMessageRoleEnum,
} from "openai/dist/api";
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate,
} from "langchain/prompts";
import { ConversationChain } from "langchain/chains";
import { BufferWindowMemory } from "langchain/memory";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { getItem, setItem } from "@/util/LocalStorageUtil";

interface P {
  apiKey: string;
  name: string;
  onMessage: (message: string) => void;
}

export function Bot({ apiKey, name }: P) {
  const [chain, setChain] = useState<ConversationChain | null>(null);
  const [systemMessage, setSystemMessage] = useState(
    getItem("systemMessage") || ""
  );
  const [messages, setMessages] = useState<ChatCompletionRequestMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (apiKey) {
      const chatOpenAi = new ChatOpenAI({
        temperature: 0.2,
        openAIApiKey: apiKey,
      });
      const template = SystemMessagePromptTemplate.fromTemplate(
        `「幽霊は存在するか？」というテーマで議論します。あなたは「幽霊は存在しない」というスタンスを絶対に崩さないでください。相手を論破してください。`
      );
      const chatPrompt = ChatPromptTemplate.fromPromptMessages([
        template,
        new MessagesPlaceholder("history"),
        HumanMessagePromptTemplate.fromTemplate("{input}"),
      ]);
      const chain = new ConversationChain({
        memory: new BufferWindowMemory({
          returnMessages: true,
          memoryKey: "history",
          k: 5,
        }),
        prompt: chatPrompt,
        llm: chatOpenAi,
      });

      setChain(chain);
    }
  }, [apiKey]);

  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          console.log("post", newMessage);
          if (chain) {
            setMessages([
              ...messages,
              {
                role: ChatCompletionRequestMessageRoleEnum.User,
                content: newMessage,
              },
            ]);
            const res = await chain.call({ input: newMessage });
            console.log("res", res);

            setMessages([
              ...messages,
              {
                role: ChatCompletionRequestMessageRoleEnum.User,
                content: newMessage,
              },
              {
                role: ChatCompletionRequestMessageRoleEnum.Assistant,
                content: res.response,
              },
            ]);
          }
          setNewMessage("");
        }}
      >
        <div>
          <Label htmlFor="system" value={`System of ${name} `} />
          <Textarea
            id="system"
            placeholder="Please write system description here"
            required
            rows={4}
            onInput={(e) => {
              const value = (e.target as HTMLInputElement).value;
              setSystemMessage(value);
              setItem(`system-of-${name}`, value);
            }}
            value={systemMessage}
          />
        </div>
        <div>
          <Label htmlFor="new-message" value="New Message" />
          <Textarea
            id="new-message"
            placeholder="Please write content to post here"
            required
            rows={4}
            onInput={(e) => {
              const value = (e.target as HTMLTextAreaElement).value;
              setNewMessage(value);
            }}
            value={newMessage}
          />
        </div>
        <div>
          <Button type="submit">Post</Button>
        </div>
      </form>
      <h2>Messages</h2>
      <ul>
        {messages.map((message, i) => {
          return (
            <li key={i}>
              {message.role}: {message.content}
            </li>
          );
        })}
      </ul>
    </>
  );
}
