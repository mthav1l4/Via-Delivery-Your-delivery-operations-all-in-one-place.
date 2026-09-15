import { cookies } from "next/headers";
import { sessionUser } from "@/server/security.mjs";
export async function getCurrentUser() {
  const user = sessionUser((await cookies()).get("via_session")?.value);
  return user
    ? {
        userId: String(user.id),
        email: String(user.email),
        displayName: String(user.name),
        isAdmin: !!user.is_admin,
      }
    : null;
}
