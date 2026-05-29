import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as exegesisExpress from 'exegesis-express';
import * as path from 'path';
import * as http from "http";
import { loadUser, RuntimeUser } from './middleware/auth';
import { inspect } from 'util';
import { SERVER_CONFIG } from './config/GameConfig';
import * as logger from './utils/Logger';
const APP_VERSION = (require('../package.json').version as string) || '0.0.1';

/* 
// import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* */

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

export async function createServer() {
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
        authenticators: {
            bearerAuth: sessionAuthenticator,
        }
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

    // Security headers
    app.use((_req, res, next) => {
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });

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

    // If you have any body parsers, this should go before them.
    app.use(exegesisMiddleware);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Return a 404
    app.use((req, res) => {
        res.status(404).json({ message: `Not found` });
    });

    // Handle any unexpected errors
    app.use((err, req, res, next) => {
        logger.error({
            event: 'unhandled_error',
            method: req.method,
            path: req.path || req.url,
            message: err?.message,
            stack: err?.stack,
        });
        res.status(500).json({ message: `Internal error: ${err.message}\n\n${inspect(err)}` });
    });

    const server = http.createServer(app);

    return server;
}

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
