import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/dashboard/",
          "/login/",
          "/register/",
          "/forgot-password/",
          "/reset-password/",
          "/verify-email/",
        ],
      },
    ],

    sitemap:
      "https://brainfriendglobaltech.vercel.app/sitemap.xml",
  };
}