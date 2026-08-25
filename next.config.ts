import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.0.101"],
};

export default withPWA({
  dest: "public",
  register: true,
})(nextConfig);