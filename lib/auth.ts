import { compare } from "bcryptjs";
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",

      credentials: {
        email: {},
        password: {},
      },

      async authorize(credentials) {
        // -----------------------------------------
        // CHECK CREDENTIALS
        // -----------------------------------------

        if (
          !credentials?.email ||
          !credentials?.password
        ) {
          throw new Error("Missing credentials");
        }

        // -----------------------------------------
        // NORMALIZE EMAIL
        // -----------------------------------------

        const email =
          credentials.email.trim().toLowerCase();

        // -----------------------------------------
        // FIND USER
        // -----------------------------------------

        const user =
          await prisma.user.findUnique({
            where: {
              email,
            },
          });

        if (!user) {
          throw new Error(
            "Invalid email or password"
          );
        }

        // -----------------------------------------
        // CHECK ACCOUNT STATUS
        // -----------------------------------------

        if (user.status !== "ACTIVE") {
          throw new Error(
            "Your account has been suspended."
          );
        }

        // -----------------------------------------
        // EMAIL VERIFICATION TEMPORARILY DISABLED
        // -----------------------------------------
        //
        // We are NOT checking emailVerified here.
        //
        // Existing users whose emailVerified is false
        // can still log in.
        //
        // Email verification can be enabled later.
        //

        // -----------------------------------------
        // CHECK PASSWORD
        // -----------------------------------------

        const validPassword =
          await compare(
            credentials.password,
            user.password
          );

        if (!validPassword) {
          throw new Error(
            "Invalid email or password"
          );
        }

        // -----------------------------------------
        // RETURN USER
        // -----------------------------------------

        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  // -----------------------------------------
  // SESSION
  // -----------------------------------------

  session: {
    strategy: "jwt",
  },

  // -----------------------------------------
  // CALLBACKS
  // -----------------------------------------

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id =
          token.id as string;

        session.user.role =
          token.role as string;
      }

      return session;
    },
  },

  // -----------------------------------------
  // LOGIN PAGE
  // -----------------------------------------

  pages: {
    signIn: "/login",
  },

  // -----------------------------------------
  // SECRET
  // -----------------------------------------

  secret: process.env.NEXTAUTH_SECRET,
};