import NextAuth from "next-auth";
import DiscordProvider from "next-auth/providers/discord";
import fs from "fs";
import path from "path";

export const authOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      authorization: { params: { scope: 'identify email guilds' } },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      if (profile) {
        token.id = profile.id;
        try {
          const configPath = path.join(process.cwd(), '../config.json');
          const rawData = fs.readFileSync(configPath, 'utf8');
          const JSONbig = require('json-bigint')({ storeAsString: true });
          const config = JSONbig.parse(rawData);
          
          if (config.master_user_ids && config.master_user_ids.includes(String(profile.id))) {
            token.role = "master";
          } else {
            token.role = "user";
          }
        } catch (error) {
          console.error("Failed to read config.json:", error);
          token.role = "user";
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.accessToken = token.accessToken;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // After sign-in, always go to select-server
      if (url.startsWith(baseUrl) || url.startsWith("/")) {
        // If this is returning from OAuth callback, force /select-server
        if (url.includes("/api/auth") || url === baseUrl || url === baseUrl + "/") {
          return `${baseUrl}/select-server`;
        }
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        return url;
      }
      return `${baseUrl}/select-server`;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
