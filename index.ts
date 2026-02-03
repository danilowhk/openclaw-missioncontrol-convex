import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { missionControlConvexPlugin } from "./src/channel.js";

const plugin = {
  id: "missioncontrol-convex",
  name: "Mission Control (Convex)",
  description: "Mission Control Convex chat channel plugin",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    api.registerChannel({ plugin: missionControlConvexPlugin });
  },
};

export default plugin;
