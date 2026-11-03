# LAN Card Game

A local multiplayer card game with a React frontend, a Fastify server and shared TypeScript game logic. Players join from their browsers on the same network.

## Getting started

With Node.js 20+ and pnpm installed, run `pnpm install`, then `pnpm dev`. The development frontend runs at http://localhost:5173 and the server at http://localhost:3000.

For a production build, run `pnpm build` and `pnpm start`. To join from another device on the same network, use the host computer's LAN address on port 3000.
