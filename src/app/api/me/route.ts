import { withAuth } from "@/lib/api-handler";
import { ok } from "@/lib/api-response";
import { userService } from "@/services/user.service";

export const GET = withAuth(async ({ userId }) => {
  return ok(await userService.me(userId));
});
