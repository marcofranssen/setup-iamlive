const os = require("os");
const core = require("@actions/core");
const tc = require("@actions/tool-cache");

export async function setupIamlive() {
  const iamliveVersion = core.getInput("iamlive-version");
  core.debug(`Installing iamlive ${iamliveVersion}…`);

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
}

function mapOS(os) {
  const mappings = {
    win32: "windows",
  };
  return mappings[os] || os;
}

function mapArch(arch) {
  const mappings = {
    x32: "386",
    x64: "amd64",
  };
  return mappings[arch] || arch;
}

function extract(archive, platform) {
  if (platform === "linux") {
    core.debug("Untarring iamlive CLI archive");
    return tc.extractTar(archive);
  }
  core.debug("Unzipping iamlive CLI archive");
  return tc.extractZip(archive);
}

async function downloadCLI(url, platform) {
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
