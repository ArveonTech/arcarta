import nodemailer from "nodemailer";
import { AuthError } from "../middlewares/errorHandler";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendMeessage = async ({
  token,
  recipientEmail,
  expire,
}: {
  token: string;
  recipientEmail: string;
  expire: number;
}) => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: recipientEmail,
      subject: `Hello`,
      text: `Dear User,
    Your One-Time Password (OTP) for account verification is:

    **${token}**

    This code will remain valid for **${expire} minute**.
    If you did not initiate this request, we recommend disregarding this email.
    Please do not share this code with anyone for security reasons.

    Best regards,
    Arcarta Team`,
      html: `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; background:#f6f9fc; margin:0; padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr>
        <td align="center">
          <table style="max-width:600px; width:100%; background:#ffffff; border-radius:8px; padding:24px; box-shadow:0 2px 6px rgba(16,24,40,0.08);" cellpadding="0" cellspacing="0" role="presentation">
            <tr>
              <td style="padding-bottom:12px; color:#0f172a; font-size:18px; font-weight:600;">
                Arcarta
              </td>
            </tr>

            <tr>
              <td style="color:#0f172a; font-size:16px; line-height:1.5; padding-bottom:16px;">
                Dear User,
              </td>
            </tr>

            <tr>
              <td style="padding:12px 0;">
                <p style="margin:0 0 12px 0; color:#0f172a; font-size:15px;">
                  Your One-Time Password (OTP) for account verification is:
                </p>

                <div style="display:inline-block; padding:14px 18px; background:#f3f4f6; border-radius:8px; font-weight:700; letter-spacing:2px; font-size:20px; color:#0b1220;">
                  ${token}
                </div>

                <p style="margin:16px 0 0 0; color:#475569; font-size:14px;">
                  This code will remain valid for <strong>${expire} minute(s)</strong>.
                </p>

                <p style="margin:12px 0 0 0; color:#475569; font-size:14px;">
                  If you did not initiate this request, please ignore this email. For security reasons, do not share this code with anyone.
                </p>
              </td>
            </tr>

            <tr>
              <td style="padding-top:18px; color:#6b7280; font-size:13px;">
                Best regards,<br/>
                Arcarta Team
              </td>
            </tr>

            <tr>
              <td style="padding-top:18px; border-top:1px solid #eef2f7; font-size:12px; color:#9aa4b2;">
                This message was sent by Arcarta. If you have any questions, contact our support team.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`,
    });

    return info.messageId;
  } catch (error) {
    console.info(error);
    if (error instanceof TypeError) {
      throw new AuthError({
        message: `Error send OTP email:${error.message}`,
        statusCode: 401,
      });
    } else {
      throw new AuthError({ message: `Error send OTP email`, statusCode: 401 });
    }
  }
};
