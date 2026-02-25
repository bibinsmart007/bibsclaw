export interface AgentTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  tools: string[];
  systemPrompt: string;
  rating: number;
  downloads: number;
}

export const BUILT_IN_TEMPLATES: AgentTemplate[] = [
  {
    id: 'devops-agent', name: 'DevOps Agent', category: 'Engineering',
    description: 'CI/CD, deployment, and infrastructure management',
    tools: ['git', 'docker', 'ssh', 'http'], systemPrompt: 'You are a DevOps engineer assistant.',
    rating: 4.8, downloads: 1200,
  },
  {
    id: 'marketing-agent', name: 'Marketing Agent', category: 'Marketing',
    description: 'Content creation, social media, and analytics',
    tools: ['social', 'analytics', 'content'], systemPrompt: 'You are a digital marketing assistant.',
    rating: 4.6, downloads: 890,
  },
];
