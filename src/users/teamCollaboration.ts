import { EventEmitter } from "events";

export interface Team {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  members: TeamMember[];
  sharedResources: SharedResource[];
  createdAt: Date;
  settings: TeamSettings;
}

export interface TeamMember {
  userId: string;
  username: string;
  role: "lead" | "member" | "readonly";
  joinedAt: Date;
  lastActive?: Date;
}

export interface SharedResource {
  type: "chat" | "task" | "file" | "analytics";
  resourceId: string;
  name: string;
  sharedBy: string;
  sharedAt: Date;
  permissions: ("read" | "write" | "comment")[];
}

export interface TeamSettings {
  allowGuestAccess: boolean;
  requireApproval: boolean;
  maxMembers: number;
  notifyOnNewMessage: boolean;
  sharedAnalytics: boolean;
}

export interface TeamComment {
  id: string;
  teamId: string;
  resourceId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  edited?: Date;
  replyTo?: string;
}

export class TeamCollaborationManager extends EventEmitter {
  private teams: Map<string, Team> = new Map();
  private comments: TeamComment[] = [];

  constructor() { super(); }

  createTeam(name: string, description: string, ownerId: string, ownerUsername: string): Team {
    const id = "team_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const team: Team = {
      id, name, description, ownerId,
      members: [{ userId: ownerId, username: ownerUsername, role: "lead", joinedAt: new Date() }],
      sharedResources: [], createdAt: new Date(),
      settings: { allowGuestAccess: false, requireApproval: true, maxMembers: 10, notifyOnNewMessage: true, sharedAnalytics: true },
    };
    this.teams.set(id, team);
    this.emit("teamCreated", team);
    return team;
  }

  addMember(teamId: string, userId: string, username: string, role: TeamMember["role"] = "member"): void {
    const team = this.teams.get(teamId);
    if (!team) throw new Error("Team not found");
    if (team.members.length >= team.settings.maxMembers) throw new Error("Team is full");
    if (team.members.some(m => m.userId === userId)) throw new Error("Already a member");
    team.members.push({ userId, username, role, joinedAt: new Date() });
    this.emit("memberAdded", { teamId, userId, username });
  }

  removeMember(teamId: string, userId: string): void {
    const team = this.teams.get(teamId);
    if (!team) return;
    if (team.ownerId === userId) throw new Error("Cannot remove team owner");
    team.members = team.members.filter(m => m.userId !== userId);
    this.emit("memberRemoved", { teamId, userId });
  }

  shareResource(teamId: string, resource: Omit<SharedResource, "sharedAt">): void {
    const team = this.teams.get(teamId);
    if (!team) throw new Error("Team not found");
    if (team.sharedResources.some(r => r.resourceId === resource.resourceId)) {
      throw new Error("Resource already shared");
    }
    team.sharedResources.push({ ...resource, sharedAt: new Date() });
    this.emit("resourceShared", { teamId, resource });
  }

  addComment(teamId: string, resourceId: string, userId: string, username: string, content: string, replyTo?: string): TeamComment {
    const comment: TeamComment = {
      id: "cmt_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      teamId, resourceId, userId, username, content, timestamp: new Date(), replyTo,
    };
    this.comments.push(comment);
    this.emit("commentAdded", comment);
    return comment;
  }

  getTeamComments(teamId: string, resourceId: string): TeamComment[] {
    return this.comments.filter(c => c.teamId === teamId && c.resourceId === resourceId).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  getTeam(teamId: string): Team | null { return this.teams.get(teamId) || null; }
  getAllTeams(): Team[] { return Array.from(this.teams.values()); }
  getUserTeams(userId: string): Team[] { return Array.from(this.teams.values()).filter(t => t.members.some(m => m.userId === userId)); }
  getTeamCount(): number { return this.teams.size; }
}

export const teamCollaborationManager = new TeamCollaborationManager();
