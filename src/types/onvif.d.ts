import { Request } from 'express';
import { DeviceInfoService } from '../services/onvif/DeviceInfoService';
import { Server } from '../server';

declare module 'onvif' {
    export class OnvifDevice {
        constructor(config: {
            address: string;
            port: number;
            user: string;
            pass: string;
        });

        init(): Promise<void>;
        getEventService(): any;
    }

    export class Cam {
        constructor(config: {
            hostname: string;
            username: string;
            password: string;
            port: number;
            timeout?: number;
        }, callback: (error: Error | null, camera?: Cam) => void);

        getEventProperties(callback: (error: Error | null, events: any) => void): void;
    }
}

