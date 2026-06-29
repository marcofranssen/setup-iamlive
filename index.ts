import { setFailed } from "@actions/core";
import { setupIamlive } from "./lib/setup-iamlive.js";

setupIamlive().catch((e: unknown) =>
  setFailed(e instanceof Error ? e.message : String(e))
);
