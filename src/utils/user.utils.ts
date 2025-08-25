import "server-only";
import { auth } from "@/auth";
import { CurrentUser } from "@/models/user.model";

export const getCurrentUser = async () => {
  const session = await auth();
  if (!session?.user) return null;
  
  const user: CurrentUser = {
    id: session.user.id,
    name: session.user.name || '',
    email: session.user.email || '',
    // These might not be available in the session, set to undefined if not needed
    iat: undefined,
    exp: undefined,
  };
  return user;
};
