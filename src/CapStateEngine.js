const UNKNOWN_STATE = 'UNKNOWN';

export class CapStateEngine {
  constructor(targetCountries) {
    this.targetCountries = targetCountries;
  }

  evaluate(previousState, currentState) {
    const changes = [];

    for (const country of this.targetCountries) {
      const oldStatus = (previousState[country] || UNKNOWN_STATE);
      const newStatus = (currentState[country] || UNKNOWN_STATE);

      // Skip evaluation if state hasn't changed or is unknown
      if (oldStatus === newStatus || newStatus === UNKNOWN_STATE) {
        continue;
      }

      changes.push({
        country,
        type: oldStatus === UNKNOWN_STATE && newStatus !== 'OPEN' ? 'NEW' : newStatus,
        oldStatus: previousState[country],
        newStatus: newStatus,
      });
    }

    return changes;
  }
}