import type { ChatMessage } from "../ai/modelRouter.js";

export class ConversationSummarizer {
  private maxMessages = 20;
  private summaries: string[] = [];

  shouldSummarize(messageCount: number): boolean {
    return messageCount > this.maxMessages;
  }

  createSummary(messages: ChatMessage[]): string {
    const userMessages = messages.filter(m => m.role === "user");
    const assistantMessages = messages.filter(m => m.role === "assistant");
    const topics: string[] = [];
    for (const msg of userMessages) {
      const words = msg.content.split(/\s+/).filter(w => w.length > 5);
      topics.push(...words.slice(0, 3));
    }
    const uniqueTopics = [...new Set(topics)].slice(0, 8);
    const summary = `Previous conversation (${messages.length} messages): Discussed ${uniqueTopics.join(", ")}. User asked ${userMessages.length} questions. Assistant provided ${assistantMessages.length} responses.`;
    this.summaries.push(summary);
    return summary;
  }

  compactMessages(messages: ChatMessage[]): ChatMessage[] {
    if (messages.length <= this.maxMessages) return messages;
    const summary = this.createSummary(messages.slice(0, -this.maxMessages));
    return [
      { role: "system", content: `Context from earlier: ${summary}` },
      ...messages.slice(-this.maxMessages),
    ];
  }

  getSummaries(): string[] { return this.summaries; }
}
