type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

function normalizePayload(input: unknown): Record<string, unknown> {
    if (input instanceof Error) {
        return { message: input.message, name: input.name, stack: input.stack };
    }
    if (typeof input === 'string') {
        return { message: input };
    }
    if (input && typeof input === 'object') {
        return input as Record<string, unknown>;
    }
    return { message: String(input) };
}

function serialize(payload: Record<string, unknown>): string {
    try {
        return JSON.stringify(payload);
    } catch (_err) {
        return JSON.stringify({ message: 'failed to serialize log payload' });
    }
}

function write(level: LogLevel, obj: unknown): void {
    if (level === 'DEBUG' && !process.env['LGM_DEBUG']) {
        return;
    }

    const payload = {
        timestamp: new Date().toISOString(),
        level,
        ...normalizePayload(obj),
    };
    const line = serialize(payload);
    if (level === 'WARN' || level === 'ERROR') {
        process.stderr.write(`${line}\n`);
        return;
    }
    process.stdout.write(`${line}\n`);
}

export function debug(obj: unknown): void { write('DEBUG', obj); }
export function info(obj: unknown): void { write('INFO', obj); }
export function warn(obj: unknown): void { write('WARN', obj); }
export function error(obj: unknown): void { write('ERROR', obj); }
