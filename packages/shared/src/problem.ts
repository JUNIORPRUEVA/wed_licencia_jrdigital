export type ProblemDetails = {
  type?: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  errors?: Record<string, string[]>;
};

export function problem(
  status: number,
  title: string,
  detail?: string,
  errors?: Record<string, string[]>
): ProblemDetails {
  return {
    title,
    status,
    detail,
    ...(errors ? { errors } : {}),
  };
}
