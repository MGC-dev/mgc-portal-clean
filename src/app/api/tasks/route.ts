import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getClientTasksByEmail, groupClientTasks } from "@/lib/bigin-tasks";
import { clientSafeZohoMessage, ZohoAuthError } from "@/lib/zoho-workdrive";

// Read-only: the board is the team's delivery tracker, so the portal renders
// task state but never writes a stage change back to Bigin.
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.email) {
      return NextResponse.json({ error: "No email associated with user" }, { status: 400 });
    }

    const tasks = await getClientTasksByEmail(user.email);

    return NextResponse.json({
      board: groupClientTasks(tasks),
      total: tasks.length,
    });
  } catch (error: any) {
    console.error("Client Tasks Error:", error);
    return NextResponse.json(
      { error: clientSafeZohoMessage(error) },
      { status: error instanceof ZohoAuthError && error.rateLimited ? 503 : 500 }
    );
  }
}
