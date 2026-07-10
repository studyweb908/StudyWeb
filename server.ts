import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON Body Parser for API Requests
  app.use(express.json());

  // API Route: Send Contact Form Submission via Email
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, role, subject, message } = req.body;

      if (!name || !email || !role || !subject || !message) {
        res.status(400).json({ error: "All required fields must be filled out." });
        return;
      }

      const host = process.env.SMTP_HOST;
      const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      const recipient = process.env.CONTACT_RECIPIENT_EMAIL || "studyweb908@gmail.com";

      console.log("=== Outgoing Contact Submission ===");
      console.log(`Sender Name : ${name}`);
      console.log(`Sender Email: ${email}`);
      console.log(`Sender Role : ${role}`);
      console.log(`Subject     : ${subject}`);
      console.log(`Recipient   : ${recipient}`);
      console.log(`Message     : ${message}`);
      console.log("===================================");

      // Check if SMTP details are defined
      if (!host || !user || !pass) {
        console.warn(
          "SMTP variables (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured. Falling back to console logging to prevent application crash."
        );
        res.json({
          success: true,
          status: "logged_to_console",
          message: "Message received! (SMTP configuration not set in the workspace settings, so the submission was logged to the server terminal)."
        });
        return;
      }

      // Configure SMTP transporter with TLS options to prevent certificate rejections
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for other ports
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false // Do not fail on self-signed certificates or strict local SMTP setups
        }
      });

      const mailOptions = {
        from: `"${name} via StudyWeb Contact" <${user}>`,
        replyTo: email,
        to: recipient,
        subject: `StudyWeb Contact: ${subject} from ${name}`,
        text: `You received a new message from the StudyWeb contact form:

Name: ${name}
Email: ${email}
Who are they: ${role}
Subject: ${subject}

Message:
${message}
`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; line-height: 1.6; max-width: 600px; border: 1px solid #eaeaea; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-top: 0;">New StudyWeb Contact Submission</h2>
            <p>You received a new message from the StudyWeb landing page contact form.</p>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 6px 0; font-weight: bold; width: 120px;">Name:</td>
                <td style="padding: 6px 0;">${name}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Email:</td>
                <td style="padding: 6px 0;"><a href="mailto:${email}">${email}</a></td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Role/Who:</td>
                <td style="padding: 6px 0;">${role}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; font-weight: bold;">Subject:</td>
                <td style="padding: 6px 0;">${subject}</td>
              </tr>
            </table>
            <hr style="border: 0; border-top: 1px solid #eaeaea; margin: 20px 0;" />
            <h3 style="color: #333;">Message:</h3>
            <p style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 4px solid #4f46e5; margin: 0; white-space: pre-wrap;">${message}</p>
            <footer style="margin-top: 30px; font-size: 11px; color: #999;">
              This email was sent automatically from the StudyWeb application server.
            </footer>
          </div>
        `,
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent successfully: ${info.messageId}`);
      res.json({
        success: true,
        status: "sent_successfully",
        message: "Your message has been sent successfully to StudyWeb!"
      });
    } catch (error: any) {
      console.error("Error sending email in backend contact route:", error);
      res.status(500).json({
        error: "Failed to send the email due to server-side mailer error.",
        details: error.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
