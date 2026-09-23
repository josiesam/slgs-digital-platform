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
    define: {
      "import.meta.env.CLOUDFLARE_R2_ACCESS_KEY_ID": JSON.stringify(
        environment.CLOUDFLARE_R2_ACCESS_KEY_ID,
      ),
      "import.meta.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY": JSON.stringify(
        environment.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
      ),
      "import.meta.env.CLOUDFLARE_R2_REGION": JSON.stringify(
        environment.CLOUDFLARE_R2_REGION,
      ),
      "import.meta.env.CLOUDFLARE_R2_BUCKET": JSON.stringify(
        environment.CLOUDFLARE_R2_BUCKET,
      ),
      "import.meta.env.CLOUDFLARE_R2_ENDPOINT": JSON.stringify(
        environment.CLOUDFLARE_R2_ENDPOINT,
      ),
      "import.meta.env.CLOUDFLARE_R2_ACCESS_URL": JSON.stringify(
        environment.CLOUDFLARE_R2_ACCESS_URL,
      ),
    },
    plugins: [
      tanstackStart(),
      nitro({ preset: "vercel" }),
      tailwindcss(),
      react(),
    ],
    server: { port: 3002 },
    ssr: {
      noExternal: ["@platejs/math", "katex", "react-tweet"],
    },
  };
});
