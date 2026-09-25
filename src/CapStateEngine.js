export class CapStateEngine {
  evaluate(previousState, currentState) {
    const changes = [];

    for (const [country, newStatusRaw] of Object.entries(currentState)) {
      const oldStatus = (previousState[country] || 'unknown').toLowerCase();
      const newStatus = (newStatusRaw || 'unknown').toLowerCase();

      // Skip evaluation if state hasn't changed or baseline is unknown
      if (oldStatus === newStatus || oldStatus === 'unknown') {
        continue;
      }

      if (newStatus.includes('open')) {
        changes.push({
          country,
          type: 'REOPENED',
          oldStatus: previousState[country],
          newStatus: newStatusRaw,
        });
      } else if (newStatus.includes('closed') || newStatus.includes('paused')) {
        changes.push({
          country,
          type: 'CLOSED',
          oldStatus: previousState[country],
          newStatus: newStatusRaw,
        });
      }
    }

    return changes;
  }
}