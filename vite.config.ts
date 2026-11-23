import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Relative paths allow deployment under a GitHub Pages repository URL.
  base: "./",
});
