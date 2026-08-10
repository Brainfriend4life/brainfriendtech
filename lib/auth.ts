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
        if (
          !credentials?.email ||
          !credentials?.password
        ) {
          throw new Error("Missing credentials");
        }

        const email =
          credentials.email.trim().toLowerCase();

        const user =
          await prisma.user.findUnique({
            where: {
              email,
            },
          });

        if (!user) {
          throw new Error("User not found");
        }

        /*
         * CHECK ACCOUNT STATUS
         */
        if (user.status !== "ACTIVE") {
          throw new Error(
            "Your account has been suspended."
          );
        }

        /*
         * CHECK EMAIL VERIFICATION
         */
        if (!user.emailVerified) {
          throw new Error(
            "Please verify your email before logging in."
          );
        }

        /*
         * CHECK PASSWORD
         */
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

        /*
         * RETURN USER
         */
        return {
          id: user.id,
          name: user.fullName,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

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

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,
};