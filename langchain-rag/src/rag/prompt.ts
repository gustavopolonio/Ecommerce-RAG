import {
  ChatMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
} from "@langchain/core/prompts";

export interface DemoShopPromptInput {
  assistantInstructions: string;
  context: string;
  question: string;
}

export function createDemoShopPrompt(): ChatPromptTemplate<DemoShopPromptInput> {
  const developerMessage = ChatMessagePromptTemplate.fromTemplate(
    "{assistantInstructions}",
    "developer",
  );
  const userMessage = HumanMessagePromptTemplate.fromTemplate(
    [
      "Answer the customer question using only the retrieved DemoShop documents as factual context.",
      "",
      "<retrieved_documents>",
      "{context}",
      "</retrieved_documents>",
      "",
      "<customer_question>",
      "{question}",
      "</customer_question>",
    ].join("\n"),
  );

  return ChatPromptTemplate.fromMessages<DemoShopPromptInput>([
    developerMessage,
    userMessage,
  ]);
}
