import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { Resend } from "resend";

export const sendEmailTool = createTool({
  id: "send-email",
  description: "Send the daily news digest as an HTML email via Resend.",
  inputSchema: z.object({
    subject: z.string().describe("Email subject line"),
    htmlBody: z.string().describe("Full HTML content of the digest email"),
    recipient: z
      .string()
      .email()
      .optional()
      .describe("Override recipient email (defaults to RECIPIENT_EMAIL env var)"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ subject, htmlBody, recipient }) => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return {
        success: false,
        error: "RESEND_API_KEY not set. Email not sent.",
      };
    }

    const to = recipient || process.env.RECIPIENT_EMAIL;
    if (!to) {
      return {
        success: false,
        error: "No recipient email. Set RECIPIENT_EMAIL in .env",
      };
    }

    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: "News Agent <digest@resend.dev>",
        to,
        subject,
        html: htmlBody,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    } catch (err: any) {
      return { success: false, error: `Email send failed: ${err.message}` };
    }
  },
});
