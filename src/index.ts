// Apply the ONVIF library patch before importing

import { Server } from './server';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get the port from environment variables or use a default
const PORT = parseInt(process.env.PORT || '4000', 10);

// Initialize and start the server
try {
  Server.Initialize();
  Server.Start(PORT);
} catch (error) {
  Server.Logs.fatal('Failed to initialize or start the server:', error);
  process.exit(1);
}
