export interface TaskTemplate { id: string; name: string; description: string; cron?: string; variables: Record<string, string>; steps: Array<{ tool: string; params: Record<string, string> }>; }
export const builtInTemplates: TaskTemplate[] = [
  { id: "daily-backup", name: "Daily Backup", description: "Backup project files daily", cron: "0 2 * * *", variables: { backupDir: "./backups" }, steps: [{ tool: "shellExec", params: { command: "tar -czf ${backupDir}/backup-$(date +%Y%m%d).tar.gz ./src" } }] },
  { id: "health-check", name: "Health Check", description: "Check system health every 5 min", cron: "*/5 * * * *", variables: { endpoint: "http://localhost:3000/health" }, steps: [{ tool: "httpRequest", params: { url: "${endpoint}", method: "GET" } }] },
  { id: "git-sync", name: "Git Sync", description: "Auto pull and push git changes", cron: "0 */6 * * *", variables: { branch: "main" }, steps: [{ tool: "shellExec", params: { command: "git pull origin ${branch} && git push origin ${branch}" } }] },
  { id: "log-cleanup", name: "Log Cleanup", description: "Clean old log files weekly", cron: "0 3 * * 0", variables: { logDir: "./logs", daysOld: "30" }, steps: [{ tool: "shellExec", params: { command: "find ${logDir} -name *.log -mtime +${daysOld} -delete" } }] },
  { id: "dependency-check", name: "Dependency Check", description: "Check for outdated deps", cron: "0 9 * * 1", variables: {}, steps: [{ tool: "shellExec", params: { command: "npm outdated" } }] },
];
export function getTemplate(id: string): TaskTemplate | undefined { return builtInTemplates.find(t => t.id === id); }
export function listTemplates(): Array<{ id: string; name: string; description: string }> { return builtInTemplates.map(({ id, name, description }) => ({ id, name, description })); }
export function instantiateTemplate(template: TaskTemplate, overrides: Record<string, string> = {}): TaskTemplate {
  const vars = { ...template.variables, ...overrides };
  const steps = template.steps.map(step => ({
    tool: step.tool,
    params: Object.fromEntries(Object.entries(step.params).map(([k, v]) => [k, Object.entries(vars).reduce((s, [vk, vv]) => s.replace(new RegExp("\$\{" + vk + "\}", "g"), vv), v)]))
  }));
  return { ...template, variables: vars, steps };
}
