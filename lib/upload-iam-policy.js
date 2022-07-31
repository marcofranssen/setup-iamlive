const { readFile, open } = require("fs/promises");
const { basename } = require("path");
const core = require("@actions/core");
const artifact = require("@actions/artifact");
const find = require("find-process");

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
    return Promise.reject(`PolicyFile ${policyFile} not found.`);
  }

  if (core.isDebug()) {
    const policy = await readFile(policyFile);
    core.debug(policy);
  }

  return uploadPolicy(uploadName, policyFile, 0);
}

async function shutdownIamLive() {
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fileExists(fileName) {
  try {
    await open(fileName, "r");
    return true;
  } catch (e) {
    return false;
  }
}

async function uploadPolicy(policyName, policyFile, retention) {
  core.info(`Uploading ${policyFile} as ${policyName}`);

  const artifactClient = artifact.create();

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

  core.debug(`Policy upload result: ${uploadResponse}`);

  return uploadResponse;
}
