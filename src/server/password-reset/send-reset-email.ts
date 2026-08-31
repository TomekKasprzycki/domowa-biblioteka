import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  await transport.sendMail({
    from: `"Domowa Biblioteka" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Reset your Domowa Biblioteka password",
    text: `We received a request to reset your password. Use the link below within one hour to set a new one:\n\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`,
  });
}
