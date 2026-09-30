const UNKNOWN_STATE = 'UNKNOWN';

export class CapStateEngine {
  constructor(subscriptionsRaw) {
    if (!subscriptionsRaw) throw new Error('Subscriptions are required.');

    let subscriptionsParsed = {};
    try {
      subscriptionsParsed = JSON.parse(subscriptionsRaw);
    } catch (err) {
      throw new Error('Failed to parse Subscriptions.');
    }

    if (Object.keys(subscriptionsParsed).length === 0)
      throw new Error('Subscriptions are empty.');

    this.subscriptions = subscriptionsParsed;
  }

  evaluate(previousState, currentState) {
    const changes = [];

    for (const [country, subs] of Object.entries(this.subscriptions)) {
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
        subscriptions: subs
      });
    }

    return changes;
  }
}