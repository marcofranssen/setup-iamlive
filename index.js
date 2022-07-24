const core = require("@actions/core");
const { setupIamlive } = require("./lib/setup-iamlive");

setupIamlive().catch((e) => core.setFailed(e.message));
