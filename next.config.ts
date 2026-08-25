import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Dev-only. Next blocks cross-origin requests to dev assets and endpoints by
   * default, and only the hostname the server booted with (`localhost`) is
   * trusted. Opening the app from a phone — over the LAN IP or through an
   * ngrok tunnel — is a different origin, so those assets are refused, React
   * never hydrates, and the page renders but every button is dead.
   *
   * Listing the origins used for device testing fixes that. This has no effect
   * on `next build` / `next start`.
   */
  allowedDevOrigins: [
    // This machine on the local network. Add the new address here if the
    // router hands out a different one (`ipconfig` → IPv4 Address).
    "192.168.15.163",
    "192.168.15.*",
    // ngrok tunnels, for testing on phones outside this network.
    "*.ngrok-free.app",
    "*.ngrok-free.dev",
    "*.ngrok.app",
    "*.ngrok.io",
    // Cloudflare quick tunnels (`cloudflared tunnel --url`). The hostname is
    // assigned at random on every start and cannot be reserved, so the wildcard
    // is the only form that survives a restart.
    "*.trycloudflare.com",
  ],
};

export default nextConfig;
