import { Request } from 'express';
import { DeviceInfoService } from '../services/onvif/DeviceInfoService';
import { Server } from '../server';

declare module 'onvif' {
  export class Cam {
    constructor(
      config: {
        hostname: string;
        username: string;
        password: string;
        port: number;
        timeout?: number;
      },
      callback: (error: Error | null, camera?: Cam) => void
    );

    getEventProperties(callback: (error: Error | null, events: any) => void): void;

    // New methods added based on actual runtime behavior
    getProfiles(callback: (error: Error | null, profiles: any[]) => void): void;
    getStreamUri(
      options: { protocol: string },
      callback: (error: Error | null, stream: any) => void
    ): void;
  }
}

export function startProbe(): Promise<any[]>;
export function Discovery(): any;


