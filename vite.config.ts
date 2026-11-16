import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { mapsDevProxyPlugin } from "./vite.mapsProxy";

// https://vite.dev/config/
export default defineConfig({
  optimizeDeps: {
    include: ["react-date-range", "date-fns"],
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        icon: true,
        // This will transform your SVG to a React component
        exportType: "named",
        namedExport: "ReactComponent",
      },
    }),
    mapsDevProxyPlugin(),
  ],
  server: {
    port: 5174,
    proxy: {
      // cabs-aggregator (auth + admin analytics/config)
      "/auth": "http://127.0.0.1:4100",
      "/admin": "http://127.0.0.1:4100",
      "/health": "http://127.0.0.1:4100",
      "/v1": "http://127.0.0.1:4100",
    },
  },
});
