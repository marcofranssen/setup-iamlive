import * as os from "os";
import { ChildProcess, spawn } from "child_process";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";

export async function setupIamlive() {
  const iamliveVersion = core.getInput("iamlive-version");
  const autoCapture = core.getBooleanInput("auto-capture");
  const outputFile = core.getInput("output-file");

  core.debug(`Installing iamlive ${iamliveVersion}…`);
  core.debug(`Writing policy to ${outputFile}…`);

  const osPlatform = os.platform();
  const osArch = os.arch();
  const platform = mapOS(osPlatform);
  const arch = mapArch(osArch);

  const downloadURL = `https://github.com/iann0036/iamlive/releases/download/${iamliveVersion}/iamlive-${iamliveVersion}-${platform}-${arch}.tar.gz`;

  const cachedPath =
    tc.find("iamlive", iamliveVersion, osArch) ||
    (await (async () => {
      const pathToCLI = await downloadCLI(downloadURL, platform);
      return tc.cacheDir(pathToCLI, "iamlive", iamliveVersion, osArch);
    })());

  core.addPath(cachedPath);
  core.setOutput("iamlive-version", iamliveVersion);

  if (autoCapture) {
    await runIamlive(outputFile);
    core.info("Running iamlive in the background");
  }
}

async function runIamlive(outputFile: string): Promise<ChildProcess> {
  return new Promise((resolve) => {
    const cmd = "iamlive";
    const options = [
      "--background",
      "--sort-alphabetical",
      "--output-file",
      outputFile,
    ];
    core.info(`${cmd} ${options.join(" ")}`);
    const iamlive = spawn(cmd, options, {
      detached: true,
      stdio: "ignore",
    });
    iamlive.unref();
    resolve(iamlive);
  });
}

function mapOS(os: string): string {
  const mappings: Record<string, string> = {
    win32: "windows",
  };
  return mappings[os] || os;
}

function mapArch(arch: string): string {
  const mappings: Record<string, string> = {
    x32: "386",
    x64: "amd64",
  };
  return mappings[arch] || arch;
}

function extract(archive: string, platform: string): Promise<string> {
  if (platform === "linux") {
    core.debug("Untarring iamlive CLI archive");
    return tc.extractTar(archive);
  }
  core.debug("Unzipping iamlive CLI archive");
  return tc.extractZip(archive);
}

async function downloadCLI(url: string, platform: string): Promise<string> {
  core.debug(`Downloading iamlive from ${url}…`);
  const pathToCLIArchive = await tc.downloadTool(url);
  core.debug(`iamlive CLI archive downloaded to ${pathToCLIArchive}`);

  const pathToCLI = await extract(pathToCLIArchive, platform);
  core.debug(`iamlive CLI path is ${pathToCLI}.`);

  if (!pathToCLIArchive || !pathToCLI) {
    throw new Error(`Unable to download iamlive from ${url}`);
  }

  return pathToCLI;
}
