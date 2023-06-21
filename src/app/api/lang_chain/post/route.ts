import { PostApiParams } from "@/app/model/Model";
import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanChatMessage, SystemChatMessage } from "langchain/schema";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const { apiKey, createChatCompletionRequest } = json as PostApiParams;

  const chat = new ChatOpenAI({ temperature: 0, openAIApiKey: apiKey });
  const responseB = await chat.call([
    new SystemChatMessage(
      "You are a helpful assistant that translates English to French."
    ),
    new HumanChatMessage("Translate: I love programming."),
  ]);

  console.log(responseB);

  try {
    return new NextResponse(JSON.stringify(""), {
      status: 200,
    });
  } catch (error: any) {
    console.error(error);
    return new NextResponse("An error occurred during your request.", {
      status: 500,
    });
  }
}
