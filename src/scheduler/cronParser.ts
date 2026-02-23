import { EventEmitter } from "events";
export interface CronField { type: "wildcard"|"value"|"range"|"step"|"list"; values: number[]; }
export interface ParsedCron { minute: CronField; hour: CronField; dayOfMonth: CronField; month: CronField; dayOfWeek: CronField; }
export function parseCronExpression(expr: string): ParsedCron {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) throw new Error("Invalid cron: need 5 fields");
  const [minute, hour, dom, month, dow] = parts.map(parseCronField);
  return { minute, hour, dayOfMonth: dom, month, dayOfWeek: dow };
}
function parseCronField(field: string): CronField {
  if (field === "*") return { type: "wildcard", values: [] };
  if (field.includes("/")) { const [,step]=field.split("/"); const s=parseInt(step,10); const v:number[]=[]; for(let i=0;i<60;i+=s)v.push(i); return {type:"step",values:v}; }
  if (field.includes("-")) { const [a,b]=field.split("-").map(Number); const v:number[]=[]; for(let i=a;i<=b;i++)v.push(i); return {type:"range",values:v}; }
  if (field.includes(",")) return { type: "list", values: field.split(",").map(Number) };
  return { type: "value", values: [parseInt(field, 10)] };
}
export function matchesCron(p: ParsedCron, d: Date): boolean {
  const checks=[{f:p.minute,v:d.getMinutes()},{f:p.hour,v:d.getHours()},{f:p.dayOfMonth,v:d.getDate()},{f:p.month,v:d.getMonth()+1},{f:p.dayOfWeek,v:d.getDay()}];
  return checks.every(({f,v})=>f.type==="wildcard"||f.values.includes(v));
}
export class CronScheduler extends EventEmitter {
  private jobs = new Map<string,{cron:ParsedCron;cb:()=>void|Promise<void>;enabled:boolean}>();
  private timer: ReturnType<typeof setInterval>|null = null;
  start() { this.timer = setInterval(()=>this.tick(),60000); }
  stop() { if(this.timer){clearInterval(this.timer);this.timer=null;} }
  addJob(id:string,expr:string,cb:()=>void|Promise<void>) { this.jobs.set(id,{cron:parseCronExpression(expr),cb,enabled:true}); this.emit("jobAdded",{id}); }
  removeJob(id:string) { return this.jobs.delete(id); }
  private async tick() { const now=new Date(); for(const[id,j]of this.jobs){if(j.enabled&&matchesCron(j.cron,now)){try{await j.cb();this.emit("ok",{id});}catch(e){this.emit("fail",{id,e});}}} }
  listJobs() { return Array.from(this.jobs.entries()).map(([id,j])=>({id,enabled:j.enabled})); }
}
