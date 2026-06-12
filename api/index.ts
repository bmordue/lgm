import * as bodyParser from 'body-parser';
import express = require('express');
import * as exegesisExpress from 'exegesis-express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import * as path from 'path';
import * as http from "http";
import { loadUser, RuntimeUser } from './middleware/auth';
import { inspect } from 'util';
import { getSecurityConfig, SERVER_CONFIG } from './config/GameConfig';
import { webSocketService } from './service/WebSocketService';
import * as logger from './utils/Logger';
const APP_VERSION = (require('../package.json').version as string) || '0.0.1';

/* 
// import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* */

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function createValidationError(status: number, message: string): Error & { status: number } {
    return Object.assign(new Error(message), { status });
}

function validateRequestBody(value: unknown): void {
    if (Array.isArray(value)) {
        value.forEach(validateRequestBody);
        return;
    }

    if (!value || typeof value !== 'object') {
        return;
    }

    for (const [key, nestedValue] of Object.entries(value)) {
        if (FORBIDDEN_KEYS.has(key)) {
            throw createValidationError(400, `Request body contains forbidden property: ${key}`);
        }
        validateRequestBody(nestedValue);
    }
}

function createSecureJsonParser(maxBodySize: number) {
    const jsonParser = bodyParser.json({
        inflate: true,
        limit: maxBodySize,
        strict: true,
        type: '*/*',
    });

    return {
        parseString(value: string) {
            try {
                const parsed = JSON.parse(value);
                validateRequestBody(parsed);
                return parsed;
            } catch (err) {
                if (err instanceof SyntaxError) {
                    throw createValidationError(400, 'Invalid JSON in request body');
                }
                throw err;
            }
        },
        parseReq(req: express.Request, res: express.Response, callback: (err?: Error | null, body?: unknown) => void) {
            jsonParser(req, res, (err: Error | null | undefined) => {
                if (err) {
                    callback(err);
                    return;
                }

                try {
                    validateRequestBody(req.body);
                    callback(null, req.body);
                } catch (validationErr) {
                    callback(validationErr as Error);
                }
            });
        }
    };
}



interface ApiMetrics {
    startedAt: string;
    requestsTotal: number;
    totalResponseTimeMs: number;
    responsesByStatus: Record<string, number>;
    requestsByMethod: Record<string, number>;
    requestsByPath: Record<string, number>;
}

function increment(counter: Record<string, number>, key: string): void {
    counter[key] = (counter[key] || 0) + 1;
}

function createMetrics(): ApiMetrics {
    return {
        startedAt: new Date().toISOString(),
        requestsTotal: 0,
        totalResponseTimeMs: 0,
        responsesByStatus: {},
        requestsByMethod: {},
        requestsByPath: {},
    };
}

/**
 * Create and configure the HTTP server without starting it.
 * Used by the runtime entrypoint and integration tests.
 */
export async function createServer() {
    const securityConfig = getSecurityConfig();    async function sessionAuthenticator(pluginContext) {
        // The loadUser middleware sets res.locals.user on the Express response.
        // In Exegesis's PluginContext, the original Express response is accessible
        // via pluginContext.req.res (Express sets req.res = res internally).
        const user: RuntimeUser | undefined = (pluginContext.req as any).res?.locals?.user;
        if (!user || user.isGuest) {
            return { type: 'missing', statusCode: 401, message: 'Authentication required' };
        }
        return { type: 'success', user, roles: user.groups || [], scopes: [] };
    }

    // See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
    const options = {
        controllers: path.resolve(__dirname, 'controllers'),
        allowMissingControllers: false,
        // Return complete OpenAPI validation feedback instead of only the first error.
        allErrors: true,
        authenticators: {
            bearerAuth: sessionAuthenticator,
        },
        defaultMaxBodySize: securityConfig.maxBodySizeBytes,
        mimeTypeParsers: {
            'application/json': createSecureJsonParser(securityConfig.maxBodySizeBytes),
        },
        strictValidation: true,
    };

    // This creates an exegesis middleware, which can be used with express,
    // connect, or even just by itself.
    const exegesisMiddleware = await exegesisExpress.middleware(
        path.resolve(__dirname, '../spec/api.yml'),
        options
    );

    const app: express.Express = express();

    // Trust the first proxy for correct IP resolution
    app.set('trust proxy', 1);
    app.disable('x-powered-by');

    app.use(helmet({
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    }));

    app.use(rateLimit({
        windowMs: securityConfig.rateLimitWindowMs,
        limit: securityConfig.rateLimitMaxRequests,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        handler(_req: express.Request, res: express.Response) {
            res.status(429).json({ message: 'Too many requests, please try again later.' });
        },
    }));

    const metrics = createMetrics();

    app.use((req, res, next) => {
        const start = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
            const pathKey = req.path || req.url;
            metrics.requestsTotal += 1;
            metrics.totalResponseTimeMs += durationMs;
            increment(metrics.requestsByMethod, req.method);
            increment(metrics.responsesByStatus, String(res.statusCode));
            increment(metrics.requestsByPath, pathKey);
            logger.info({
                event: 'http_request',
                method: req.method,
                path: pathKey,
                statusCode: res.statusCode,
                durationMs: Number(durationMs.toFixed(3)),
                remoteAddress: req.ip,
            });
        });
        next();
    });

    app.get('/health', (_req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptimeSeconds: Number(process.uptime().toFixed(3)),
            version: APP_VERSION,
        });
    });

    app.get('/metrics', (_req, res) => {
        const averageResponseTimeMs = metrics.requestsTotal > 0
            ? metrics.totalResponseTimeMs / metrics.requestsTotal
            : 0;
        res.status(200).json({
            startedAt: metrics.startedAt,
            uptimeSeconds: Number(process.uptime().toFixed(3)),
            requests: {
                total: metrics.requestsTotal,
                byMethod: metrics.requestsByMethod,
                byPath: metrics.requestsByPath,
            },
            responses: {
                byStatus: metrics.responsesByStatus,
                averageResponseTimeMs: Number(averageResponseTimeMs.toFixed(3)),
            },
        });
    });

    // Load user identity from proxy headers (or DEV_STUB_USER in dev)
    app.use(loadUser);

    // Exegesis owns request parsing and validation.
    app.use(exegesisMiddleware);

    // Return a 404
    app.use((req, res) => {
        res.status(404).json({ message: `Not found` });
    });

    // Handle any unexpected errors
    app.use((err, req, res, next) => {
        const status = typeof err?.status === 'number'
            ? err.status
            : typeof err?.statusCode === 'number'
                ? err.statusCode
            // body-parser sets err.type='entity.too.large' when payload limits are exceeded.
            : err?.type === 'entity.too.large'
                ? 413
                : 500;
        const isProduction = process.env.NODE_ENV === 'production';
        const message = status >= 500
            ? (isProduction ? 'Internal server error' : `Internal error: ${err.message}\n\n${inspect(err)}`)
            : (err?.message || 'Bad request');

        logger.error({
            event: 'unhandled_error',
            method: req.method,
            path: req.path || req.url,
            message: err?.message,
            stack: err?.stack,
        });
        res.status(status).json({ message });
    });

    const server = http.createServer(app);
    webSocketService.initialize(server);

    return server;
}

const port = SERVER_CONFIG.port;
const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : undefined;


if (require.main === module) {
    const port = SERVER_CONFIG.port;
    const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : undefined;

    createServer()
        .then(server => {
            server.listen(port, host);
            logger.info({ event: 'server_started', port, requestedHost: host || 'all_interfaces' });
        })
        .catch(err => {
            logger.error({ event: 'server_start_failed', message: err?.message, stack: err?.stack });
            process.exit(1);
        });
}
