import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Camera access (getUserMedia) requires a "secure context". localhost
    // is treated as secure by browsers, so plain http://localhost:5173 is
    // fine for local development - no HTTPS certificate needed.
    host: "localhost",
  },
});
