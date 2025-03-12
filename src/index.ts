import 'dotenv/config';
import { Server } from './server';

const port = Number(process.env.PORT) || 4000;

Server.Initialize();
Server.Start(port);

