import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as exegesisExpress from 'exegesis-express';
import * as path from 'path';
import * as http from "http";
import { loadUser, RuntimeUser } from './middleware/auth';
import { inspect } from 'util';
import { SERVER_CONFIG } from './config/GameConfig';

/* 
// import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* */

async function createServer() {
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
        res.status(500).json({ message: `Internal error: ${err.message}\n\n${inspect(err)}` });
    });

    const server = http.createServer(app);

    return server;
}

const port = SERVER_CONFIG.port;
const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : undefined;

// Start server directly (database initialization removed for now)
createServer()
    .then(server => {
        server.listen(port, host);
        console.log(`Listening on port ${port}`);
    })
    .catch(err => {
        console.error('Failed to start server:', err);
        process.exit(1);
    });

