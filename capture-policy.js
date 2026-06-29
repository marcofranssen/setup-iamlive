import { setFailed } from "@actions/core";
import { capturePolicy } from "./lib/upload-iam-policy.js";

capturePolicy().catch((e) => setFailed(e.message));
