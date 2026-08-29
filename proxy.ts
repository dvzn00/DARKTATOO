import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/**
 * Renova a sessão e tranca /admin antes de qualquer renderização.
 *
 * Chamava-se `middleware` até o Next 16, que renomeou a convenção para
 * `proxy`. O comportamento é o mesmo.
 */
export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/admin/:path*", "/login"],
};
