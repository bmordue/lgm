import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as exegesisExpress from 'exegesis-express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import * as path from 'path';
import * as http from "http";
import { loadUser, RuntimeUser } from './middleware/auth';
import { inspect } from 'util';
import { getSecurityConfig, SERVER_CONFIG } from './config/GameConfig';

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

/**
 * Create and configure the HTTP server without starting it.
 * Used by the runtime entrypoint and integration tests.
 */
export async function createServer() {
    const securityConfig = getSecurityConfig();

    async function sessionAuthenticator(pluginContext) {
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

        res.status(status).json({ message });
    });

    const server = http.createServer(app);

    return server;
}

const port = SERVER_CONFIG.port;
const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : undefined;

async function startServer() {
    const server = await createServer();
    server.listen(port, host);
    console.log(`Listening on port ${port}`);
}

if (require.main === module) {
    startServer()
        .catch(err => {
            console.error('Failed to start server:', err);
            process.exit(1);
        });
}
