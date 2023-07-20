"use client";
import { AppProvider } from "./context/AppContext";
import { ChatCompletionBProvider } from "./context/ChatCompletionBContext";
import { ChatCompletionAProvider } from "./context/ChatCompletionAContext";
import { TalkProvider } from "./context/TalkContext";
import Talk from "./Talk";

export default function TalkPage() {
  return (
    <AppProvider>
      <TalkProvider>
        <ChatCompletionAProvider>
          <ChatCompletionBProvider>
            <Talk />
          </ChatCompletionBProvider>
        </ChatCompletionAProvider>
      </TalkProvider>
    </AppProvider>
  );
}
