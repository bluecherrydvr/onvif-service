import { Cam } from 'onvif';
import { DeviceInfoService } from './DeviceInfoService';
import { Server } from '../../server';

export class OnvifEventInterface {
  private camera?: Cam & { getEventProperties?: Function };

  constructor(private deviceId: number) {}

  async initialize(): Promise<void> {
    try {
      const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(this.deviceId);

      if (!DeviceInfoService.validateConnectionInfo(deviceInfo)) {
        throw new Error(`Invalid device connection info for device ${this.deviceId}`);
      }

      await this.connectToCamera({
        hostname: deviceInfo.ipAddress,
        port: deviceInfo.onvifPort,
        username: deviceInfo.rtspUsername,
        password: deviceInfo.rtspPassword
      });

      await this.getEventProperties();
    } catch (error) {
      Server.Logs.error(`Failed to initialize ONVIF interface: ${error}`);
      throw error;
    }
  }

  private connectToCamera(config: {
    hostname: string,
    port: number,
    username: string,
    password: string
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.camera = new Cam(config, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async getEventProperties(): Promise<void> {
    if (!this.camera || typeof (this.camera as any).getEventProperties !== 'function') {
      throw new Error('Camera does not support event services');
    }

    (this.camera as any).getEventProperties((err: any, result: any) => {
      if (err) {
        Server.Logs.error(`Failed to get event properties: ${err.message}`);
        return;
      }
      Server.Logs.debug(`Event properties for device ${this.deviceId}: ${JSON.stringify(result)}`);
    });
  }

  stop(): void {
    this.camera = undefined;
  }

async startEventSubscription(): Promise<void> {
  if (!this.camera || !(this.camera as any).services?.events) {
    throw new Error('Camera does not support event services');
  }

  (this.camera as any).services.events.createPullPointSubscription((err: any, result: any) => {
    if (err) {
      Server.Logs.error(`Failed to subscribe to events: ${err.message}`);
    } else {
      Server.Logs.info(`Subscribed to events for device ${this.deviceId}`);
      Server.Logs.debug(`PullPointSubscription Response: ${JSON.stringify(result)}`);
    }
  });
}

async stopEventSubscription(): Promise<void> {
  Server.Logs.info(`Unsubscribing from events for device ${this.deviceId}`);
  this.stop(); // Resets camera
}

}

