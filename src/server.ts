import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { Logger, getLogger, configure } from 'log4js';
import { Sequelize } from 'sequelize';
import { Models } from './models/Models';
import { registerRoutes } from './routes/Routes';
import { WatcherService } from './services/WatcherService';
//import { registerAllModels } from './models/Models';


//WatcherService.start();
//registerAllModels();


export class Server {
  public static Logs: Logger = getLogger('ONVIF Service');
  public static App = express();
  public static sequelize: Sequelize;

  public static Initialize(): void {
    // Setup logging
    configure({
      appenders: {
        out: { type: 'stdout' },
        onvif: { type: 'file', filename: 'logs/onvif-service.log' }
      },
      categories: {
        default: { appenders: ['out', 'onvif'], level: 'debug' }
      }
    });

    // Configure Sequelize
    this.sequelize = new Sequelize(
      process.env.DB_DATABASE || 'bluecherry',
      process.env.DB_USERNAME || 'bluecherry',
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        define: { timestamps: false }
      }
    );

    // Setup middleware
    this.App.use(cors({
      origin: 'https://192.168.87.144:7001',
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));
    this.App.use(json());
  }

  public static async Start(port: number): Promise<void> {
    try {
      await this.sequelize.authenticate();
      this.Logs.info('Database connection established');

      await Models.Initialize();       // ✅ Initialize models first
      registerRoutes(this.App);       // ✅ Then routes
      WatcherService.start();         // ✅ Only now start the Watcher

      this.App.listen(port, '0.0.0.0', () => {
        this.Logs.info(`ONVIF Service - ONVIF Service started on port ${port}`);
      });
    } catch (error) {
      this.Logs.fatal('Failed to start server:', error);
      process.exit(1);
    }
  }
}
