import { auth0 } from "@/lib/auth0";
import "server-only";

export const getUserProfileData = async () => {
  const session = await auth0.getSession();

  if (!session) {
    throw new Error(`Requires authentication`);
  }

  const { user } = session;

  return user;
};
