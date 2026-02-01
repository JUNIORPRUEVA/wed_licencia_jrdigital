import type { Response } from "express";
import type { ZodError } from "zod";
import { problem, type ProblemDetails } from "@fulltech/shared";

export function sendProblem(res: Response, p: ProblemDetails) {
  res.status(p.status).json(p);
}

export function zodToProblem(err: ZodError, title = "Validación inválida") {
  const errors: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".") || "_";
    errors[path] ??= [];
    errors[path].push(issue.message);
  }
  return problem(400, title, "Revisa los campos enviados.", errors);
}
