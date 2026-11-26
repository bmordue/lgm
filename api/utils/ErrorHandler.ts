import { LGMError } from "./Errors";

export class ApiError extends Error {
    constructor(
        public statusCode: number,
        public message: string,
        public code?: string
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export function handleControllerError(context: any, error: any) {
    if (error instanceof ApiError) {
        context.res.status(error.statusCode);
        const response: any = {
            message: error.message,
        };
        if (error.code) {
            response.code = error.code;
        }
        return response;
    }

    if (error instanceof LGMError) {
        context.res.status(error.statusCode);
        return {
            message: error.message,
        };
    }

    // Unknown error - log and return generic 500
    console.error('Unexpected error in controller:', error);
    context.res.status(500);
    return {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_ERROR'
    };
}
