import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/supabase/audit";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { action, comment } = body;

    if (action !== "approve" && action !== "return") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check caller role
    const { data: callerProfile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "manager") {
      return NextResponse.json({ error: "Forbidden: Not a manager" }, { status: 403 });
    }

    // Verify goal
    const { data: goal, error: goalError } = await supabase
      .from("goals")
      .select("*, users!goals_employee_id_fkey(manager_id)")
      .eq("id", id)
      .single();

    if (goalError || !goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    // Verify it belongs to one of their direct reports
    if (goal.users?.manager_id !== user.id) {
      return NextResponse.json({ error: "Forbidden: Not your direct report" }, { status: 403 });
    }

    // Cannot approve/return if not submitted
    if (goal.status !== "submitted") {
      return NextResponse.json({ error: "Goal is not in a submitted state" }, { status: 400 });
    }

    const oldStatus = goal.status;
    let newStatus = "";
    const updatePayload: any = {};

    if (action === "approve") {
      newStatus = "locked";
      updatePayload.status = "locked";
      updatePayload.locked_at = new Date().toISOString();
    } else if (action === "return") {
      newStatus = "returned";
      updatePayload.status = "returned";
      updatePayload.manager_comment = comment || null;
    }

    const { error: updateError } = await supabase
      .from("goals")
      .update(updatePayload)
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log audit
    await logAudit({
      userId: user.id,
      goalId: id,
      action: action === "approve" ? "APPROVED" : "RETURNED",
      entityType: "goal",
      oldValue: { status: oldStatus },
      newValue: { status: newStatus },
      supabaseClient: supabase,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error approving/returning goal:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
