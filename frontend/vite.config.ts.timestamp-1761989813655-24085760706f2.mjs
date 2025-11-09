import { defineConfig } from "file:///C:/Users/suday/OneDrive/Desktop/OOM_Project-main%20(1)%20-%20Copy/OOM_Project-main/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/suday/OneDrive/Desktop/OOM_Project-main%20(1)%20-%20Copy/OOM_Project-main/frontend/node_modules/@vitejs/plugin-react/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true
  }
});
export {
  vite_config_default as default
};
