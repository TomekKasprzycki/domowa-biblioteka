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
    subject: "Zresetuj hasło do Domowej Biblioteki",
    text: `Otrzymaliśmy prośbę o zresetowanie Twojego hasła. Skorzystaj z poniższego linku w ciągu godziny, aby ustawić nowe hasło:\n\n${resetUrl}\n\nJeśli to nie Ty złożyłeś tę prośbę, możesz zignorować tę wiadomość.`,
  });
}
