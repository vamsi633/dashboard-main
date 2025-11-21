// lib/mail.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendInviteEmail(to: string, inviteUrl: string) {
  const from = process.env.MAIL_FROM ?? process.env.SMTP_USER;

  const html = `
    <div style="font-family: sans-serif; line-height: 1.5;">
      <h2>You’re invited to join Epic IoT</h2>
      <p>Click the link below to accept your invitation:</p>
      <p><a href="${inviteUrl}" style="color: #2F4358;">${inviteUrl}</a></p>
      <p>If the link doesn't work, copy and paste it into your browser.</p>
      <p>This link will expire soon.</p>
    </div>
  `;

  await transporter.sendMail({
    from,
    to,
    subject: "Your Epic IoT invitation link",
    html,
  });
}
