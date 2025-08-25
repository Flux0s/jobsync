import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth, handlers, signIn, signOut } = NextAuth({
  ...authConfig,
  // Add any additional NextAuth.js configuration here
  session: {
    strategy: "jwt",
  },
  // Disable debug in production
  debug: process.env.NODE_ENV === "development",
});

export { auth, handlers, signIn, signOut };
