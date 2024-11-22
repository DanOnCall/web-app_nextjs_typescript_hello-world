import { auth0Client } from "@/lib/auth0-client";
import "server-only";

export const getUserProfileData = async () => {
  const session = await auth0Client.getSession();

  if (!session) {
    throw new Error(`Requires authentication`);
  }

  const { user } = session;

  return user;
};
