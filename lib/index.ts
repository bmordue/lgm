
import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as exegesisExpress from 'exegesis-express';
import * as path from 'path';
import * as http from "http";
import { userForToken } from './controllers/UsersController';

/* 
// import * as path from 'path';
import * as url from 'url';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
/* */

async function createServer() {
const { verifyToken } = require('./tokenUtils');
    async function sessionAuthenticator(pluginContext) {
        const bearerToken = pluginContext.req.headers.authorization.split('Bearer ')[1];

        if (!bearerToken) {
            return { type: 'missing', statusCode: 401, message: 'Session key required' };
        } 
        
        // Assuming secretOrHash is fetched from a secure source or configuration
        const secretOrHash = "your_secret_or_hash_here"; // Replace with actual method to retrieve hash

        const isValidToken = await verifyToken(bearerToken, secretOrHash);

        if (!isValidToken) {
            return { type: 'invalid', statusCode: 401, message: 'Invalid bearer token' };
        }

        // Assuming the token itself contains necessary user information or an ID to fetch the user
        // This part of the code might need adjustment based on how users are managed
        const authenticatedUser = { id: "user_id_from_token", roles: [], scopes: [] }; // Example user object

        return { type: 'success', user: authenticatedUser };
    }

    // See https://github.com/exegesis-js/exegesis/blob/master/docs/Options.md
    const options = {
        controllers: path.resolve(__dirname, 'controllers'),
        allowMissingControllers: false,
        authenticators: {
            bearerAuth: sessionAuthenticator,
            // sessionKey: sessionAuthenticator
        }
    };

    // This creates an exegesis middleware, which can be used with express,
    // connect, or even just by itself.
    const exegesisMiddleware = await exegesisExpress.middleware(
        path.resolve(__dirname, '../api/api.yml'),
        options
    );

    const app: express.Express = express();

    // If you have any body parsers, this should go before them.
    app.use(exegesisMiddleware);
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    //    app.use(cookieParser('keyboard mouse'));

    // Return a 404
    app.use((req, res) => {
        res.status(404).json({ message: `Not found` });
    });

    // Handle any unexpected errors
    app.use((err, req, res, next) => {
        res.status(500).json({ message: `Internal error: ${err.message}` });
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

