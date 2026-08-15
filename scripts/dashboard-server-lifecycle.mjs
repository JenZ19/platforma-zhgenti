const ownedGroups = new WeakSet();

function validOwnedPid(pid) {
  return Number.isSafeInteger(pid) && pid > 0;
}

export function ownProcessGroup(pid) {
  if (!validOwnedPid(pid)) return null;
  const ownership = Object.freeze({ pid });
  ownedGroups.add(ownership);
  return ownership;
}

function ownedPid(ownership) {
  return ownership && ownedGroups.has(ownership) && validOwnedPid(ownership.pid)
    ? ownership.pid
    : null;
}

function signalOwnedGroup(pid, signal) {
  if (!validOwnedPid(pid)) return false;
  try {
    process.kill(-pid, signal);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function groupAlive(pid) {
  if (!validOwnedPid(pid)) return false;
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (error?.code === "ESRCH") return false;
    throw error;
  }
}

async function waitForGroupGone(pid, timeoutMs, pollMs) {
  const deadline = Date.now() + timeoutMs;
  while (groupAlive(pid)) {
    if (Date.now() >= deadline) return false;
    await delay(Math.min(pollMs, Math.max(1, deadline - Date.now())));
  }
  return true;
}

export async function stopOwnedProcessGroup(ownership, {
  termTimeoutMs = 2500,
  killTimeoutMs = 1000,
  pollMs = 50,
} = {}) {
  const pid = ownedPid(ownership);
  if (!pid) return { stopped: true, signaled: false, escalated: false };
  if (!groupAlive(pid)) {
    ownedGroups.delete(ownership);
    return { stopped: true, signaled: false, escalated: false };
  }

  const signaled = signalOwnedGroup(pid, "SIGTERM");
  if (!signaled || await waitForGroupGone(pid, termTimeoutMs, pollMs)) {
    ownedGroups.delete(ownership);
    return { stopped: true, signaled, escalated: false };
  }

  const escalated = signalOwnedGroup(pid, "SIGKILL");
  if (!escalated || await waitForGroupGone(pid, killTimeoutMs, pollMs)) {
    ownedGroups.delete(ownership);
    return { stopped: true, signaled, escalated };
  }

  throw new Error(`Owned dashboard process group ${pid} survived SIGKILL`);
}
