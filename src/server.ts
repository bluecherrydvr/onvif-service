import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { Logger, getLogger, configure } from 'log4js';
import { Sequelize } from 'sequelize';
import { Models } from './models/Models';
import { registerRoutes } from './routes/Routes';

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
      process.env.DB_PASSWORD || '123',
      {
        host: process.env.DB_HOST || '127.0.0.1',
        dialect: 'mysql',
        define: { timestamps: false }
      }
    );

    // Setup middleware
    this.App.use(cors());
    this.App.use(json());
  }

  public static async Start(port: number): Promise<void> {
    try {
      await this.sequelize.authenticate();
      this.Logs.info('Database connection established');

      await Models.Initialize();  // Register and sync DB models
      registerRoutes(this.App);   // Setup routes

      this.App.listen(port, () => {
        this.Logs.info(`ONVIF Service started on port ${port}`);
      });
    } catch (error) {
      this.Logs.fatal('Failed to start server:', error);
      process.exit(1);
    }
  }
}

