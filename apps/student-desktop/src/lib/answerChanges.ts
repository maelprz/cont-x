// One deduction per changed answer when a revisit is settled. Changing an initial
// selection, or changing back to the previous answer during the same visit, is free.
export class AnswerChangeTracker {
  private settled: Map<string, string>;
  private changes: Map<string, number>;

  constructor(snapshot?: { settled: Record<string, string>; changes: Record<string, number> }) {
    this.settled = new Map(Object.entries(snapshot?.settled ?? {})
      .filter(([id, answer]) => answer !== "" || (snapshot?.changes[id] ?? 0) > 0));
    this.changes = new Map(Object.entries(snapshot?.changes ?? {}));
  }

  snapshot() {
    return {
      settled: Object.fromEntries(this.settled),
      changes: Object.fromEntries(this.changes),
    };
  }

  count(questionId: string, currentAnswer: string): number {
    const previous = this.settled.get(questionId);
    return (this.changes.get(questionId) ?? 0)
      + (previous !== undefined && previous !== currentAnswer ? 1 : 0);
  }

  leave(questionId: string, currentAnswer: string): void {
    // An unanswered visit is not a first answer. Keep an existing baseline,
    // including a cleared answer, so genuine later changes still count.
    if (!currentAnswer && !this.settled.has(questionId)) return;
    this.changes.set(questionId, this.count(questionId, currentAnswer));
    this.settled.set(questionId, currentAnswer);
  }
}
