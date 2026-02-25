export interface SharedAgent {
  id: string;
  authorId: string;
  config: Record<string, unknown>;
  visibility: 'private' | 'team' | 'public';
  collaborators: string[];
  createdAt: Date;
}

export class AgentSharingService {
  private agents = new Map<string, SharedAgent>();
  share(agent: SharedAgent): void {
    this.agents.set(agent.id, agent);
  }
  addCollaborator(agentId: string, userId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;
    agent.collaborators.push(userId);
    return true;
  }
  listPublic(): SharedAgent[] {
    return Array.from(this.agents.values()).filter(a => a.visibility === 'public');
  }
  fork(agentId: string, newAuthorId: string): SharedAgent | null {
    const original = this.agents.get(agentId);
    if (!original) return null;
    const forked: SharedAgent = {
      ...original, id: `${agentId}-fork-${Date.now()}`,
      authorId: newAuthorId, collaborators: [], createdAt: new Date(),
    };
    this.agents.set(forked.id, forked);
    return forked;
  }
}

export const agentSharing = new AgentSharingService();
