export interface ScheduledPost { id: string; platform: string; content: string; scheduledAt: Date; status: "pending" | "posted" | "failed"; mediaUrl?: string; }
export class SocialScheduler {
  private posts: ScheduledPost[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  schedule(post: Omit<ScheduledPost, "status">): void { this.posts.push({ ...post, status: "pending" }); }
  start(): void { this.timer = setInterval(() => this.checkPending(), 60000); }
  stop(): void { if (this.timer) clearInterval(this.timer); }
  private async checkPending(): Promise<void> {
    const now = new Date();
    for (const post of this.posts) {
      if (post.status === "pending" && new Date(post.scheduledAt) <= now) {
        try { await this.publish(post); post.status = "posted"; } catch { post.status = "failed"; }
      }
    }
  }
  private async publish(_post: ScheduledPost): Promise<void> { console.log("[SocialScheduler] Publishing to " + _post.platform); }
  getPending(): ScheduledPost[] { return this.posts.filter(p => p.status === "pending"); }
  getAll(): ScheduledPost[] { return [...this.posts]; }
  cancel(id: string): boolean { const p = this.posts.find(x => x.id === id); if (p && p.status === "pending") { p.status = "failed"; return true; } return false; }
  importFromCSV(csv: string): number {
    const lines = csv.trim().split("\n").slice(1);
    let count = 0;
    for (const line of lines) {
      const parts = line.split(",").map((s: string) => s.trim());
      if (parts.length >= 3) { this.schedule({ id: "csv-" + Date.now() + "-" + count, platform: parts[0], content: parts[1], scheduledAt: new Date(parts[2]) }); count++; }
    }
    return count;
  }
}
