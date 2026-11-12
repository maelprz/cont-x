// One deduction per changed answer when a revisit is settled. Changing an initial
// selection, or changing back to the previous answer during the same visit, is free.
export class AnswerChangeTracker {
  private settled = new Map<string, string>();
  private changes = new Map<string, number>();

  count(questionId: string, currentAnswer: string): number {
    const previous = this.settled.get(questionId);
    return (this.changes.get(questionId) ?? 0)
      + (previous !== undefined && previous !== currentAnswer ? 1 : 0);
  }

  leave(questionId: string, currentAnswer: string): void {
    this.changes.set(questionId, this.count(questionId, currentAnswer));
    this.settled.set(questionId, currentAnswer);
  }
}
