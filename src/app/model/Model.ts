import { CreateChatCompletionRequest } from "openai/dist/api";

export interface PostApiParams {
  apiKey: string;
  createChatCompletionRequest: CreateChatCompletionRequest;
}
