import { Request } from 'express';
import { DeviceInfoService } from '../services/onvif/DeviceInfoService';
import { Server } from '../server';
import { EventEmitter } from 'events';

declare module 'onvif' {
  export interface OnvifOptions {
    hostname: string;
    port: number;
    username: string;
    password: string;
    timeout?: number;
  }

  export interface CamConfig {
    hostname: string;
    port: number;
    username: string;
    password: string;
    timeout?: number;
    preserveAddress?: boolean;
    useWSSecurity?: boolean;
  }

  export interface EventProperties {
    topicSet: {
      [key: string]: any;
    };
  }

  export class Cam extends EventEmitter {
    constructor(config: CamConfig, callback?: (error: Error | null) => void);

    connect(callback: (error: Error | null) => void): void;
    createPullPointSubscription(callback: (error: Error | null, subscription: any) => void): void;
    unsubscribe(callback: (error: Error | null) => void): void;
    getEventProperties(callback: (error: Error | null, properties: EventProperties) => void): void;
    
    // PTZ Methods
    absoluteMove(options: { x: number; y: number; zoom: number }, callback: (err: Error | null) => void): void;
    continuousMove(options: { x: number; y: number; zoom: number, timeout?: number }, callback: (err: Error | null) => void): void;
    relativeMove(options: { x: number; y: number; zoom: number }, callback: (err: Error | null) => void): void;
    stop(callback: (err: Error | null) => void): void;
    getPresets(options: any, callback: (err: Error | null, presets: any) => void): void;
    gotoPreset(options: { preset: string }, callback: (err: Error | null) => void): void;
    setPreset(options: { presetName: string, presetToken?: string }, callback: (err: Error | null, result?: any) => void): void;
    removePreset(options: { preset: string }, callback: (err: Error | null) => void): void;
    getStatus(callback: (err: Error | null, status: any) => void): void;
    getCapabilities(callback: (err: Error | null, capabilities: any) => void): void;
    getNodes(callback: (err: Error | null, nodes: any) => void): void;
    getPTZConfiguration(callback: (err: Error | null, config: any) => void): void;
    gotoHomePosition(options: any, callback: (err: Error | null) => void): void;
    setHomePosition(options: any, callback: (err: Error | null) => void): void;

    // Other Methods
    getDeviceInformation(callback: (error: Error | null, info: any) => void): void;
    getProfiles(callback: (error: Error | null, profiles: any[]) => void): void;
    getStreamUri(options: any, callback: (error: Error | null, uri: string) => void): void;
  }
}

declare module 'onvif/lib/events' {
  import { Cam } from 'onvif';

  export function pullMessages(cam: Cam, callback: (err: Error | null, data: any, xml: string) => void): void;
  export function createPullPointSubscription(cam: Cam, callback: (err: Error | null, subscription: any) => void): void;
  export function unsubscribe(cam: Cam, callback: (err: Error | null) => void): void;
}

export function startProbe(): Promise<any[]>;
export function Discovery(): any;


