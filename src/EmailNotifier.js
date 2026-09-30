import { Resend } from 'resend';

export class EmailNotifier {
  constructor(apiKey, senderEmail) {
    if (!apiKey) throw new Error('Resend API Key is required.');
    if (!senderEmail) throw new Error('Sender Email is required.');

    this.resend = new Resend(apiKey);
    this.senderEmail = `WHM Cap Alert <${senderEmail}>`;
    this.batchPayload = [];
  }

  async notify(changes, statusPageUrl, repoUrl) {
    for (const change of changes) {
      if (change.type === 'OPEN') {
        this.batchEmail(
          change.subscriptions,
          `🚀 WHM Visa Cap OPEN: ${change.country}!`,
          `<h2>Good news!</h2>
           <p>The Australian Work and Holiday Visa cap for <strong>${change.country}</strong> is now status: <strong>${change.newStatus}</strong>.</p>
           <p><a href="${statusPageUrl}">Click here to apply on the official site</a></p>
           <p>This was an auto-generated message from the <a href="${repoUrl}">whm-cap-alert GitHub repository</a>.</p>`
        );
      } else if (change.type === 'PAUSED') {
        this.batchEmail(
          change.subscriptions,
          `ℹ️ WHM Visa Cap Update: ${change.country} is now ${change.newStatus}`,
          `<p>The cap status for <strong>${change.country}</strong> has changed to: <strong>${change.newStatus}</strong>.</p>
           <p>Previously, it was: ${change.oldStatus}.</p>
           <p>This was an auto-generated message from the <a href="${repoUrl}">whm-cap-alert GitHub repository</a>.</p>`
        );
      } else if (change.type === 'NEW') {
        this.batchEmail(
          change.subscriptions,
          `✅ You are now subscribed to WHM Visa Cap updates for: ${change.country}!`,
          `<p>The Australian Work and Holiday Visa cap for <strong>${change.country}</strong> current status is: <strong>${change.newStatus}</strong>.</p>
           <p>This was an auto-generated message from the <a href="${repoUrl}">whm-cap-alert GitHub repository</a>.</p>`
        );
      } else if (change.type === 'CLOSED') {
        this.batchEmail(
          change.subscriptions,
          `❌ WHM Visa Cap for ${change.country} is CLOSED`,
          `<p>The cap status for <strong>${change.country}</strong> has changed to: <strong>${change.newStatus}</strong>.</p>
           <p>Unfortunately that means it won't reopen for this application year. For more information <a href="${statusPageUrl}">click here to go to the official site</a></p>
           <p>This was an auto-generated message from the <a href="${repoUrl}">whm-cap-alert GitHub repository</a>.</p>`
        );
      }
    }

    await this.sendBatch();
  }

  batchEmail(subscriptions, subject, htmlContent) {
    const batch = subscriptions.map((email) => ({
      from: this.senderEmail,
      to: [email],
      subject: subject,
      html: htmlContent,
    }));

    this.batchPayload.push(...batch);
    console.log(`Batched ${batch.length} emails with subject: "${subject}"`);
  }

  async sendBatch() {
    if (this.batchPayload.length === 0) {
      console.warn('There are no emails batched to send');
      return;
    }

    try {
      const { data, error } = await this.resend.batch.send(this.batchPayload);

      if (error) {
        console.error('Resend API returned an error:', error);
        return;
      }

      console.log(`Dispatched ${this.batchPayload.length} batched emails successfully!`, data);

      this.batchPayload = [];
    } catch (err) {
      console.error('Failed to send notification via Resend:', err);
    }
  }
}