import { PostApiParams } from "@/app/model/Model";
import { NextRequest, NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";

export async function POST(req: NextRequest) {
  const json = await req.json();
  const { apiKey, createChatCompletionRequest } = json as PostApiParams;
  const configuration = new Configuration({
    apiKey,
  });
  const openai = new OpenAIApi(configuration);

  try {
    const completion = await openai.createChatCompletion(
      createChatCompletionRequest
    );
    return new NextResponse(JSON.stringify(completion.data), {
      status: 200,
    });
  } catch (error: any) {
    if (error.response) {
      console.error(error.response.status, error.response.data);
      return new NextResponse(JSON.stringify(error.response.data), {
        status: error.response.status,
      });
    } else {
      console.error(`Error with OpenAI API request: ${error.message}`);
      return new NextResponse("An error occurred during your request.", {
        status: 500,
      });
    }
  }
}
