export interface EmailTemplate { id: string; name: string; subject: string; html: string; variables: string[]; }
export const builtInEmailTemplates: EmailTemplate[] = [
  { id: "welcome", name: "Welcome Email", subject: "Welcome to {{appName}}!", html: "<h1>Welcome {{name}}!</h1><p>Thanks for joining {{appName}}.</p>", variables: ["name", "appName"] },
  { id: "notification", name: "Notification", subject: "{{title}}", html: "<h2>{{title}}</h2><p>{{message}}</p><small>Sent by BibsClaw at {{timestamp}}</small>", variables: ["title", "message", "timestamp"] },
  { id: "report", name: "Weekly Report", subject: "Weekly Report - {{week}}", html: "<h1>Weekly Report</h1><p>Period: {{week}}</p><div>{{content}}</div>", variables: ["week", "content"] },
  { id: "alert", name: "System Alert", subject: "[ALERT] {{severity}}: {{title}}", html: "<div style=\"background:{{color}};padding:10px\"><h2>{{title}}</h2><p>{{details}}</p></div>", variables: ["severity", "title", "details", "color"] },
  { id: "newsletter", name: "Newsletter", subject: "{{subject}}", html: "<div style=\"max-width:600px;margin:0 auto\"><h1>{{headline}}</h1>{{sections}}<hr><p>Unsubscribe: {{unsubLink}}</p></div>", variables: ["subject", "headline", "sections", "unsubLink"] },
];
export function renderTemplate(template: EmailTemplate, vars: Record<string, string>): { subject: string; html: string } {
  let subject = template.subject;
  let html = template.html;
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`{{${key}}}`, "g");
    subject = subject.replace(re, value);
    html = html.replace(re, value);
  }
  return { subject, html };
}
export function getEmailTemplate(id: string): EmailTemplate | undefined { return builtInEmailTemplates.find(t => t.id === id); }
