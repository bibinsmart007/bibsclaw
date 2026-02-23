import { logger } from "../middleware/logger.js";

export interface PlanStep { id: number; action: string; tool?: string; input?: string; dependsOn?: number[]; status: "pending" | "running" | "done" | "failed"; result?: string; }
export interface Plan { goal: string; steps: PlanStep[]; status: "planning" | "executing" | "completed" | "failed"; createdAt: Date; }

export function createPlan(goal: string, steps: Array<Omit<PlanStep, "id" | "status">>): Plan {
  logger.info(`Creating plan: ${goal}`);
  return {
    goal,
    steps: steps.map((s, i) => ({ ...s, id: i + 1, status: "pending" as const })),
    status: "planning",
    createdAt: new Date(),
  };
}

export function getNextSteps(plan: Plan): PlanStep[] {
  const doneIds = new Set(plan.steps.filter((s) => s.status === "done").map((s) => s.id));
  return plan.steps.filter((s) => s.status === "pending" && (s.dependsOn ?? []).every((d) => doneIds.has(d)));
}

export function updateStepStatus(plan: Plan, stepId: number, status: PlanStep["status"], result?: string): Plan {
  const step = plan.steps.find((s) => s.id === stepId);
  if (step) { step.status = status; if (result) step.result = result; }
  const allDone = plan.steps.every((s) => s.status === "done");
  const anyFailed = plan.steps.some((s) => s.status === "failed");
  plan.status = anyFailed ? "failed" : allDone ? "completed" : "executing";
  return plan;
}

export function formatPlan(plan: Plan): string {
  const lines = [`Plan: ${plan.goal} [${plan.status}]`, "---"];
  for (const s of plan.steps) {
    const icon = s.status === "done" ? "v" : s.status === "failed" ? "x" : s.status === "running" ? ">" : " ";
    const deps = s.dependsOn?.length ? ` (after: ${s.dependsOn.join(", ")})` : "";
    lines.push(`[${icon}] ${s.id}. ${s.action}${deps}`);
    if (s.result) lines.push(`    Result: ${s.result.slice(0, 100)}`);
  }
  return lines.join("\n");
}
