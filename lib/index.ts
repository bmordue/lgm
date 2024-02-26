
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as exegesisExpress from 'exegesis-express';
import * as path from 'path';
import * as http from "http";

/* 
// import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* */

async function createServer() {

    async function bearerTokenAuthenticator(pluginContext) {
        const token = pluginContext.req.headers.authorization?.split(' ')[1];

        if (!token) {
            return { type: 'missing', statusCode: 401, message: 'Bearer token required' };
        } else if (token === 'DUMMY_TOKEN') {
            return { type: 'success', user: { name: 'jwalton', roles: ['read', 'write'] } };
        } else {
            return { type: 'invalid', statusCode: 401, message: 'Invalid bearer token' };
        }
    }

    const options = {
        controllers: path.resolve(__dirname, 'controllers'),
        authenticators: {
            bearerAuth: bearerTokenAuthenticator
        }
    };

    const exegesisMiddleware = await exegesisExpress.middleware(
        path.resolve(__dirname, '../api/api.yml'),
        options
    );

    const app: express.Express = express();

    app.use(exegesisMiddleware);

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    app.use((req, res) => {
        res.status(404).json({ message: `Not found` });
    });

    app.use((err, req, res, next) => {
        res.status(500).json({ message: `Internal error: ${err.message}` });
    });

    app.use((req, res, next) => {
        console.log(`${res.statusCode}: ${req.method} ${req.originalUrl}`);
        next();
    });

    const server = http.createServer(app);

    return server;
}


const port = parseInt(process.env.LGM_PORT) | 3000;

createServer()
    .then(server => {
        server.listen(port);
        console.log(`Listening on port ${port}`);
    })
    .catch(err => {
        console.error(err.stack);
        process.exit(1);
    });

