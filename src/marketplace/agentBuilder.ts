export interface AgentConfig {
  name: string;
  description: string;
  model: string;
  tools: string[];
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export class NoCodeAgentBuilder {
  private config: Partial<AgentConfig> = {};
  setName(name: string) { this.config.name = name; return this; }
  setModel(model: string) { this.config.model = model; return this; }
  addTool(tool: string) {
    this.config.tools = [...(this.config.tools || []), tool];
    return this;
  }
  setPrompt(prompt: string) { this.config.systemPrompt = prompt; return this; }
  setTemperature(t: number) { this.config.temperature = t; return this; }
  build(): AgentConfig {
    if (!this.config.name) throw new Error('Agent name required');
    return {
      name: this.config.name,
      description: this.config.description || '',
      model: this.config.model || 'claude-3-sonnet',
      tools: this.config.tools || [],
      systemPrompt: this.config.systemPrompt || '',
      temperature: this.config.temperature || 0.7,
      maxTokens: this.config.maxTokens || 4096,
    };
  }
}
