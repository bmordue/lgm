import superagent = require("superagent");
import { ChildProcess, spawn } from "child_process";
import path = require("path");

let startedProcess: ChildProcess | null = null;

async function waitForServer(baseUrl: string, attempts = 30): Promise<void> {
    for (let i = 0; i < attempts; i++) {
        try {
            await superagent.get(`${baseUrl}/users/me`);
            return;
        } catch (_err) {
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    }
    throw new Error(`E2E server not ready at ${baseUrl}`);
}

export async function ensureE2EServer(baseUrl: string): Promise<void> {
    if (startedProcess) {
        return;
    }

    try {
        await waitForServer(baseUrl, 2);
        return;
    } catch (_err) {
        // server is not running, start a local test server
    }

    const serverEntry = path.resolve(__dirname, "../index.js");
    startedProcess = spawn(process.execPath, [serverEntry], {
        cwd: path.resolve(__dirname, ".."),
        env: {
            ...process.env,
            NODE_ENV: "test",
        },
        stdio: "ignore",
    });

    await waitForServer(baseUrl);
}

export async function stopE2EServer(): Promise<void> {
    if (!startedProcess) {
        return;
    }

    await new Promise<void>((resolve) => {
        const processToStop = startedProcess!;
        startedProcess = null;
        processToStop.once("exit", () => resolve());
        processToStop.kill();
        setTimeout(() => resolve(), 1000);
    });
}
