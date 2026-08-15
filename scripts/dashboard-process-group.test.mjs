import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { test } from "node:test";
import * as lifecycle from "./dashboard-server-lifecycle.mjs";

const { groupAlive, ownProcessGroup, stopOwnedProcessGroup } = lifecycle;

function processAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function groupSignalsUnavailable(error) {
  return ["EINVAL", "ENOSYS", "ENOTSUP", "EPERM"].includes(error?.code);
}

function forceKillGroup(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0) return;
  try {
    process.kill(-pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH" && !groupSignalsUnavailable(error)) throw error;
  }
}

function forceKillProcess(pid) {
  if (!Number.isSafeInteger(pid) || pid <= 0 || !processAlive(pid)) return;
  try {
    process.kill(pid, "SIGKILL");
  } catch (error) {
    if (error?.code !== "ESRCH") throw error;
  }
}

test("cleanup polling tolerates transient EPERM while a signaled group is being reaped", async () => {
  assert.equal(typeof lifecycle.waitForGroupGone, "function", "cleanup polling helper is unavailable");
  let probes = 0;
  const gone = await lifecycle.waitForGroupGone(123, 20, 1, () => {
    probes += 1;
    if (probes === 1) throw Object.assign(new Error("permission denied while reaping"), { code: "EPERM" });
    return false;
  });
  assert.equal(gone, true);
  assert.equal(probes, 2);
});

test("cleanup removes a detached group after its npm-like leader exits", { timeout: 15_000 }, async (context) => {
  if (process.platform === "win32") {
    context.skip("POSIX process groups are unavailable on Windows");
    return;
  }

  const descendantSource = `
    process.on("SIGTERM", () => {});
    process.send?.("ready");
    setInterval(() => {}, 1000);
  `;
  const leaderSource = `
    const { spawn } = require("node:child_process");
    const descendant = spawn(process.execPath, ["-e", ${JSON.stringify(descendantSource)}], {
      stdio: ["ignore", "ignore", "ignore", "ipc"],
    });
    descendant.once("message", () => {
      process.stdout.write(String(descendant.pid), () => {
        descendant.disconnect();
        descendant.unref();
      });
    });
  `;
  const leader = spawn(process.execPath, ["-e", leaderSource], {
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const groupPid = leader.pid;
  let descendantPid = 0;
  let stdout = "";
  let stderr = "";
  leader.stdout.setEncoding("utf8");
  leader.stderr.setEncoding("utf8");
  leader.stdout.on("data", (chunk) => { stdout += chunk; });
  leader.stderr.on("data", (chunk) => { stderr += chunk; });

  try {
    const [exitCode, signalCode] = await once(leader, "exit");
    assert.equal(exitCode, 0, `fixture leader failed with ${signalCode ?? "no signal"}: ${stderr}`);
    descendantPid = Number(stdout.trim());
    assert.ok(Number.isSafeInteger(groupPid) && groupPid > 0, "fixture did not create an owned group id");
    assert.ok(Number.isSafeInteger(descendantPid) && descendantPid > 0, `fixture did not report a descendant pid: ${stdout}`);

    try {
      assert.equal(groupAlive(groupPid), true, "descendant group disappeared before cleanup could test it");
    } catch (error) {
      if (groupSignalsUnavailable(error)) {
        context.skip(`process-group signaling unavailable: ${error.code}`);
        return;
      }
      throw error;
    }
    assert.equal(processAlive(descendantPid), true, "descendant did not survive its leader");

    const forged = await stopOwnedProcessGroup({ pid: groupPid }, { termTimeoutMs: 1, killTimeoutMs: 1, pollMs: 1 });
    assert.equal(forged.signaled, false, "an unowned pid reached process-group signaling");
    assert.equal(groupAlive(groupPid), true, "an unowned handle stopped the fixture group");

    const result = await stopOwnedProcessGroup(ownProcessGroup(groupPid), {
      termTimeoutMs: 300,
      killTimeoutMs: 3000,
      pollMs: 25,
    });

    assert.equal(result.escalated, true, "SIGTERM-resistant descendant did not exercise SIGKILL fallback");
    assert.equal(groupAlive(groupPid), false, "owned process group survived cleanup");
    assert.equal(processAlive(descendantPid), false, "descendant survived process-group cleanup");
  } finally {
    forceKillGroup(groupPid);
    forceKillProcess(descendantPid);
  }
});
