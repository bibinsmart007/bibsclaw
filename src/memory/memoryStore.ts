import fs from "node:fs";
import path from "node:path";

export interface MemoryEntry {
  id: string;
  content: string;
  category: "fact" | "preference" | "context" | "summary";
  timestamp: Date;
  relevanceScore: number;
}

export class MemoryStore {
  private memories: MemoryEntry[] = [];
  private storePath: string;

  constructor(storePath?: string) {
    this.storePath = storePath || path.join(process.cwd(), ".bibsclaw", "memory.json");
    this.load();
  }

  add(content: string, category: MemoryEntry["category"] = "fact"): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      content,
      category,
      timestamp: new Date(),
      relevanceScore: 1.0,
    };
    this.memories.push(entry);
    this.save();
    return entry;
  }

  search(query: string, limit: number = 5): MemoryEntry[] {
    const queryWords = query.toLowerCase().split(/\s+/);
    return this.memories
      .map(m => {
        const contentLower = m.content.toLowerCase();
        const matchScore = queryWords.filter(w => contentLower.includes(w)).length / queryWords.length;
        return { ...m, relevanceScore: matchScore * m.relevanceScore };
      })
      .filter(m => m.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
  }

  getRecent(limit: number = 10): MemoryEntry[] {
    return [...this.memories]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  getByCategory(category: MemoryEntry["category"]): MemoryEntry[] {
    return this.memories.filter(m => m.category === category);
  }

  remove(id: string): boolean {
    const idx = this.memories.findIndex(m => m.id === id);
    if (idx === -1) return false;
    this.memories.splice(idx, 1);
    this.save();
    return true;
  }

  summarizeHistory(messages: { role: string; content: string }[]): string {
    const userMsgs = messages.filter(m => m.role === "user").map(m => m.content);
    const topics = new Set<string>();
    for (const msg of userMsgs) {
      const words = msg.toLowerCase().split(/\s+/).filter(w => w.length > 4);
      words.forEach(w => topics.add(w));
    }
    return `Conversation covered ${userMsgs.length} exchanges. Key topics: ${[...topics].slice(0, 10).join(", ")}`;
  }

  get size(): number { return this.memories.length; }

  private save(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.storePath, JSON.stringify(this.memories, null, 2));
    } catch {}
  }

  private load(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        this.memories = JSON.parse(fs.readFileSync(this.storePath, "utf-8"));
      }
    } catch { this.memories = []; }
  }
}
