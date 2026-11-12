import { describe, expect, it } from "vitest";

import { hasPaidEvaluationConfirmation } from "./paid-evaluation-confirmation.js";

describe("hasPaidEvaluationConfirmation", () => {
  it("requires the exact paid-operation flag", () => {
    expect(hasPaidEvaluationConfirmation([])).toBe(false);
    expect(hasPaidEvaluationConfirmation(["--confirm"])).toBe(false);
    expect(hasPaidEvaluationConfirmation(["--confirm-paid"])).toBe(true);
  });
});
