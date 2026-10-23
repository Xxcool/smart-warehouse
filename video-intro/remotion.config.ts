import { Config } from "@remotion/cli/config";

// Overwrite existing output without prompting.
Config.setOverwriteOutput(true);
// Keep concurrency modest for headless Chrome stability at 1080p.
Config.setConcurrency(2);
