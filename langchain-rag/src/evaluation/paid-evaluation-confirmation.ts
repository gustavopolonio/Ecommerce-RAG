export const PAID_EVALUATION_CONFIRMATION_FLAG = "--confirm-paid";

export function hasPaidEvaluationConfirmation(arguments_: string[]): boolean {
  return arguments_.includes(PAID_EVALUATION_CONFIRMATION_FLAG);
}
