import { readFile } from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

export async function runLoonScript(scriptName, options = {}) {
  const scriptPath = path.join(projectRoot, scriptName);
  const source = await readFile(scriptPath, "utf8");
  const doneCalls = [];
  const logs = [];

  const context = {
    $argument: options.argument ?? { enabled: true, debug: false, page_enhance: true },
    $request: {
      method: options.method ?? "POST",
      url: options.requestUrl ?? "https://www.youtube.com/"
    },
    $response: {
      body: options.body ?? "",
      headers: options.headers ?? { "Content-Type": "application/json; charset=UTF-8" },
      status: options.status ?? 200
    },
    $done(value = {}) {
      doneCalls.push(value);
    },
    console: {
      log(message) {
        logs.push(String(message));
      }
    }
  };

  vm.runInNewContext(source, context, {
    filename: scriptName,
    timeout: 2_000
  });

  if (doneCalls.length !== 1) {
    throw new Error(`${scriptName} called $done ${doneCalls.length} times`);
  }

  return {
    result: structuredClone(doneCalls[0]),
    logs
  };
}
