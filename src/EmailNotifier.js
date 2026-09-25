import { Resend } from 'resend';

export class EmailNotifier {
  constructor(apiKey, recipientEmail) {
    if (!apiKey) throw new Error('Resend API Key is required.');
    if (!recipientEmail) throw new Error('Recipient email is required.');

    this.resend = new Resend(apiKey);
    this.recipientEmail = recipientEmail;
    this.senderEmail = 'WHM Cap Alert <onboarding@resend.dev>';
  }

  async notify(changes, statusPageUrl) {
    for (const change of changes) {
      if (change.type === 'REOPENED') {
        await this.sendEmail(
          `🚀 WHM Visa Cap OPEN: ${change.country}!`,
          `<h2>Good news!</h2>
           <p>The Australian Work and Holiday Visa cap for <strong>${change.country}</strong> is now status: <strong>${change.newStatus}</strong>.</p>
           <p><a href="${statusPageUrl}">Click here to apply on the official site</a></p>`
        );
      } else if (change.type === 'CLOSED') {
        await this.sendEmail(
          `ℹ️ WHM Visa Cap Update: ${change.country} is now ${change.newStatus}`,
          `<p>The cap status for <strong>${change.country}</strong> has changed to: <strong>${change.newStatus}</strong>.</p>`
        );
      }
    }
  }

  async sendEmail(subject, htmlContent) {
    try {
      const data = await this.resend.emails.send({
        from: this.senderEmail,
        to: [this.recipientEmail],
        subject: subject,
        html: htmlContent,
      });
      console.log(`Email dispatched successfully for: "${subject}"`, data);
    } catch (error) {
      console.error('Failed to send notification via Resend:', error);
    }
  }
}