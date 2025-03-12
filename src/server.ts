import express from 'express';
import cors from 'cors';
import { json } from 'body-parser';
import { Logger, getLogger, configure } from 'log4js';
import { Sequelize } from 'sequelize';
import { authenticate } from './utils/Auth';
import { Routes } from './routes/Routes';
import { Models } from './models/Models';

export class Server {
    public static Logs: Logger = getLogger('ONVIF Service');
    public static App = express();
    public static sequelize: Sequelize;

    public static Initialize(): void {
        // Initialize logging
        configure({
            appenders: {
                onvif: { type: 'dateFile', filename: 'logs/onvif-service.logs' },
                console: {
                    type: 'console',
                    layout: {
                        type: 'pattern',
                        pattern: '%[%d{yyyy-MM-dd hh:mm:ss} [%c] %-5p - %m%]'
                    }
                }
            },
            categories: {
                default: {
                    appenders: ['onvif', 'console'],
                    level: 'debug'
                }
            }
        });

        // Database connection
        this.sequelize = new Sequelize(
            process.env.DB_DATABASE || 'bluecherry',
            process.env.DB_USERNAME || 'root',
            process.env.DB_PASSWORD || '',
            {
                host: process.env.DB_HOST || 'localhost',
                dialect: 'mysql',
                define: { timestamps: false },
                logging: msg => getLogger('Sequelize').debug(msg)
            }
        );

        // Middleware
        this.App.use(cors());
        this.App.use(json());
        this.App.use(authenticate);
    }

    public static async Start(port: number): Promise<void> {
        try {
            await this.sequelize.authenticate();
            this.Logs.info('Database connection established');
            
            // Initialize models
            await Models.Initialize();
            
            // Register routes
            Routes.Register(this.App);

            this.App.listen(port, () => {
                this.Logs.info(`ONVIF Service started on port ${port}`);
            });
        } catch (error) {
            this.Logs.fatal('Failed to start server:', error);
            process.exit(1);
        }
    }
}

