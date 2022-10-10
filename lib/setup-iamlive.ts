import * as os from "os";
import { readFile } from "fs/promises";
import { createHash } from "crypto";
import { ChildProcess, spawn } from "child_process";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";

const checksums: Record<string, string> = {
  "v0.49.0": `
26362081b85a8dd015f635dcf7de8cad7779ca9e102e17fa3a9e02ced26592e6  iamlive-v0.49.0-windows-amd64.zip
2f1d79cefb2813ebef851d484ee1db1c94297ae99ce242fed900a3bf99a33756  iamlive-v0.49.0-linux-386.tar.gz
3bfcf77a7cfbe58dddc64ba02860c721af5476eb6d4084306c0b09eca76b8ba1  iamlive-v0.49.0-windows-386.zip
4b341920946ee4c8aef8ce5ab9a4d42cbd2f2845736ca2afb4273c894b41ff36  iamlive-v0.49.0-darwin-arm64.tar.gz
6b3dbfcfa876666889b6fae599c6a5e7b5fda3be66d30d52a4e362cbacc5db69  iamlive-v0.49.0-linux-amd64.tar.gz
b211f1e4be8632d0ae67893a3ab9713fdc62af18a063d0c8240deef775169643  iamlive-v0.49.0-linux-arm64.tar.gz
ecf1d09532a19c1184b2649c8b7461b1586a23c437bb8e09b83495ceae2a1488  iamlive-v0.49.0-darwin-amd64.tar.gz
`,
};

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
      const pathToCLI = await downloadCLI(
        downloadURL,
        iamliveVersion,
        platform
      );
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

async function downloadCLI(
  url: string,
  version: string,
  platform: string
): Promise<string> {
  core.debug(`Downloading iamlive from ${url}…`);
  const pathToCLIArchive = await tc.downloadTool(url);
  core.debug(`iamlive CLI archive downloaded to ${pathToCLIArchive}`);

  if (!verifyChecksum(pathToCLIArchive, checksums[version])) {
    throw new Error(`Checksum didn't match: ${checksums[version]}.`);
  }

  const pathToCLI = await extract(pathToCLIArchive, platform);
  core.debug(`iamlive CLI path is ${pathToCLI}.`);

  if (!pathToCLIArchive || !pathToCLI) {
    throw new Error(`Unable to download iamlive from ${url}`);
  }

  return pathToCLI;
}

async function verifyChecksum(
  download: string,
  checksums: string
): Promise<boolean> {
  if (!checksums) {
    return true;
  }

  const rs = await readFile(download);
  const digest = createHash("sha256").update(rs).digest("hex");
  const grepChecksum = new RegExp(`.*${download.split("/").pop()}$/gm`);
  const matches = checksums.match(grepChecksum);
  return matches?.[0] === digest;
}
