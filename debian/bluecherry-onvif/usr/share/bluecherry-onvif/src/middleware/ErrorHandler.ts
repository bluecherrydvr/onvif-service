import { Request, Response, NextFunction } from 'express';
import { Server } from '../server';

export function errorHandler(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    Server.Logs.error(`Error: ${error.message}`);
    
    if (error.name === 'SocketError') {
        res.status(500).send(`Server Error - failed to connect to local socket: ${error.message}`);
    } else {
        res.status(500).send('Internal Server Error');
    }
}


