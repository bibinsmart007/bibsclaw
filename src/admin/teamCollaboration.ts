// Team Collaboration - Phase 4.4
export interface Team {
  id: string;
  name: string;
  members: TeamMember[];
  createdAt: Date;
}

export interface TeamMember {
  userId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
}

export interface SharedResource {
  id: string;
  teamId: string;
  type: 'chat' | 'task' | 'template' | 'workflow';
  name: string;
  createdBy: string;
  sharedAt: Date;
}

export class TeamManager {
  private teams: Team[] = [];
  private shared: SharedResource[] = [];

  createTeam(name: string, ownerId: string): Team {
    const team: Team = { id: Date.now().toString(36), name, members: [{ userId: ownerId, role: 'owner', joinedAt: new Date() }], createdAt: new Date() };
    this.teams.push(team);
    return team;
  }

  addMember(teamId: string, userId: string, role: TeamMember['role'] = 'member'): boolean {
    const team = this.teams.find(t => t.id === teamId);
    if (!team) return false;
    team.members.push({ userId, role, joinedAt: new Date() });
    return true;
  }

  share(teamId: string, type: SharedResource['type'], name: string, createdBy: string): SharedResource {
    const resource: SharedResource = { id: Date.now().toString(36), teamId, type, name, createdBy, sharedAt: new Date() };
    this.shared.push(resource);
    return resource;
  }

  getTeams(): Team[] { return [...this.teams]; }
  getSharedResources(teamId: string): SharedResource[] { return this.shared.filter(s => s.teamId === teamId); }
}
