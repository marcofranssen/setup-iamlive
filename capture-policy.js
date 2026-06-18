import { setFailed } from "@actions/core";
import { capturePolicy } from "./lib/upload-iam-policy";

capturePolicy().catch((e) => setFailed(e.message));
