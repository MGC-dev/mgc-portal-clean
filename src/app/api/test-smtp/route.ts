// app/api/test-email/route.ts
import { NextRequest, NextResponse } from "next/server";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

export async function GET(req: NextRequest) {
  try {
    const msg = {
      to: "your-email@example.com",               // replace with your email
      from: "mgcentral@mgconsultingfirm.com",    // verified sender
      subject: "Test SendGrid Email",
      html: "<p>Hello from SendGrid (App Router)</p>",
    };

    await sgMail.send(msg);
    console.log("✅ Email sent successfully via SendGrid");
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ SendGrid Error:", error);
    return NextResponse.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}
