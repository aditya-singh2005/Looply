import { createClient } from "./client";

export async function logAudit(params: {
  userId: string;
  goalId?: string | null;
  action: string;
  entityType: string;
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("audit_logs").insert({
    user_id: params.userId,
    goal_id: params.goalId ?? null,
    action: params.action,
    entity_type: params.entityType,
    old_value: params.oldValue ?? null,
    new_value: params.newValue ?? null,
  });
  if (error) throw error;
}
