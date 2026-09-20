import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "vite";

const workspaceRoot = fileURLToPath(new URL("../..", import.meta.url));

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, workspaceRoot, "");
  for (const [key, value] of Object.entries(environment)) {
    process.env[key] ??= value;
  }

  return {
    envDir: workspaceRoot,
    plugins: [tanstackStart(), nitro(), tailwindcss(), react()],
    server: { port: 3001 },
  };
});
