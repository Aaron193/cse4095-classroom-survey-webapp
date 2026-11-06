import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { delimiter, isAbsolute, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { build } from "vite";
import { expect, it } from "vitest";

const execFileAsync = promisify(execFile);

function findChrome(): string | undefined {
  const name = process.env.CHROME_BIN || "google-chrome";
  const candidates =
    isAbsolute(name) || name.includes("/") || name.includes("\\")
      ? [name]
      : (process.env.PATH || "")
          .split(delimiter)
          .map((directory) => join(directory, name));
  return candidates.find((candidate) => {
    try {
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

const chrome = findChrome();
if (!chrome) {
  console.warn(
    "Skipping results bar rendering test: Chrome was not found. Set CHROME_BIN to its executable to run it.",
  );
}

it.skipIf(!chrome)(
  chrome
    ? "draws a bar at the supplied percentage of the chart width"
    : "draws a bar at the supplied percentage of the chart width (skipped: Chrome not found; set CHROME_BIN)",
  async () => {
    const directory = await mkdtemp(join(tmpdir(), "survey-chart-"));
    try {
      await build({
        configFile: false,
        logLevel: "silent",
        base: "./",
        build: {
          outDir: directory,
          emptyOutDir: false,
          rollupOptions: {
            input: resolve("src/components/results/chart-test.html"),
          },
        },
      });
      const url = pathToFileURL(
        join(directory, "src/components/results/chart-test.html"),
      ).href;
      const { stdout } = await execFileAsync(
        chrome!,
        [
          `--user-data-dir=${join(directory, "profile")}`,
          "--headless",
          "--no-sandbox",
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--allow-file-access-from-files",
          "--virtual-time-budget=3000",
          "--dump-dom",
          url,
        ],
        { timeout: 20000, maxBuffer: 1024 * 1024 },
      );
      const bar = stdout.match(
        /<path[^>]*class="[^"]*recharts-rectangle[^"]*"[^>]*>/,
      );
      expect(bar, "Recharts should draw a bar rectangle").not.toBeNull();
      const width = bar?.[0].match(/\bwidth="([\d.]+)"/);
      expect(Number(width?.[1])).toBeCloseTo(150, 1);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  },
  30000,
);
