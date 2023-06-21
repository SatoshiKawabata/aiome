"use client";
import { Label, TextInput } from "flowbite-react";
import { useState } from "react";
import { Bot } from "./Bot";

export default function Chat() {
  const [apiKey, setApiKey] = useState(localStorage.getItem("apiKey") || "");
  return (
    <main className="p-8">
      <div>
        <Label htmlFor="api-key" value="ChatGPT API key" />
        <TextInput
          id="api-key"
          placeholder="Your ChatGPT API key"
          required
          type="password"
          onInput={(e) => {
            const value = (e.target as HTMLInputElement).value;
            setApiKey(value);
            localStorage.setItem("apiKey", value);
          }}
          value={apiKey}
        />
      </div>
      <Bot
        apiKey={apiKey}
        name={"test bot A"}
        onMessage={(message) => {
          console.log("test Bot A's message", message);
        }}
      />
      <Bot
        apiKey={apiKey}
        name={"test bot B"}
        onMessage={(message) => {
          console.log("test Bot B's message", message);
        }}
      />
    </main>
  );
}
