import type { DefaultSession } from "next-auth";

/**
 * Adds the user id to the session type.
 *
 * The session callback puts `user.id` on the object at runtime; without this
 * declaration TypeScript would not know it is there, and every call site would
 * need a cast.
 */
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export {};
