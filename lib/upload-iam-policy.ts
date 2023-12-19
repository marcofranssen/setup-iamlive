import find from "find-process";
import { basename } from "path";
import { readFile, open } from "fs/promises";
import * as core from "@actions/core";
import { DefaultArtifactClient } from "@actions/artifact";
import type { UploadArtifactResponse } from "@actions/artifact";

export async function capturePolicy() {
  const autoCapture = core.getBooleanInput("auto-capture");

  if (!autoCapture) {
    core.debug("auto-capture was disabled");
    return Promise.resolve();
  }

  const policyFile = core.getInput("output-file");
  const uploadName = basename(policyFile);

  core.debug(`Start shutting down iamlive`);
  await shutdownIamLive();
  core.debug(`Finished shutting down iamlive`);

  core.debug(`Checking policyFile ${policyFile}`);
  if (!(await fileExists(policyFile))) {
    core.debug("File not found.");
    throw new Error(`PolicyFile ${policyFile} not found.`);
  }

  if (core.isDebug()) {
    const policy = await readFile(policyFile);
    core.debug(policy.toString());
  }

  return uploadPolicy(uploadName, policyFile, 0);
}

async function shutdownIamLive(): Promise<void> {
  const pList = await find("name", "iamlive", true);
  if (pList.length == 0) {
    return Promise.resolve();
  }

  core.debug("shutting down iamlive…");
  const iamlive = pList[0];
  core.debug(`pid: ${iamlive.pid}, name: ${iamlive.name}`);
  process.kill(pList[0].pid, "SIGTERM");
  await sleep(1000);
  await shutdownIamLive();
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(fileName: string): Promise<boolean> {
  try {
    await open(fileName, "r");
    return true;
  } catch (e) {
    return false;
  }
}

async function uploadPolicy(
  policyName: string,
  policyFile: string,
  retention: number
): Promise<UploadArtifactResponse> {
  core.info(`Uploading ${policyFile} as ${policyName}`);

  const artifactClient = new DefaultArtifactClient();

  const rootDirectory = ".";
  const options = {
    continueOnError: false,
    retentionDays: retention,
  };

  const uploadResponse = await artifactClient.uploadArtifact(
    policyName,
    [policyFile],
    rootDirectory,
    options
  );

  core.debug(`Policy upload result: ${JSON.stringify(uploadResponse)}`);

  return uploadResponse;
}
