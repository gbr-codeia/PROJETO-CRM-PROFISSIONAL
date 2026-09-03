import { withHandler, readJson } from "@/lib/api-handler";
import { created } from "@/lib/api-response";
import { registerSchema } from "@/schemas/auth.schema";
import { userService } from "@/services/user.service";

export const POST = withHandler(async (req) => {
  const body = registerSchema.parse(await readJson(req));
  const user = await userService.register(body);
  return created(user);
});
