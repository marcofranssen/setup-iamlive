import { setFailed } from "@actions/core";
import { setupIamlive } from "./lib/setup-iamlive";

setupIamlive().catch((e) => setFailed(e.message));
