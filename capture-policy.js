const core = require("@actions/core");
const { capturePolicy } = require("./lib/upload-iam-policy");

capturePolicy().catch((e) => core.setFailed(e.message));
