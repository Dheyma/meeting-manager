import { supabase } from "./supabase";
import { getStoredUser } from "./auth";

export async function logAction(
  action: string,
  entityType?: string,
  entityDescription?: string
) {
  const user = getStoredUser();
  if (!user) return;
  await supabase.from("system_logs").insert({
    person_id: user.personId,
    person_name: user.name,
    action,
    entity_type: entityType ?? null,
    entity_description: entityDescription ?? null,
  });
}

export async function logActionAs(
  personId: string,
  personName: string,
  action: string,
  entityType?: string,
  entityDescription?: string
) {
  await supabase.from("system_logs").insert({
    person_id: personId,
    person_name: personName,
    action,
    entity_type: entityType ?? null,
    entity_description: entityDescription ?? null,
  });
}
