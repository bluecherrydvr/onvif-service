import {
  Discovery,
  Probe as ProbeType,
  Device as DeviceType,
  Events as EventsType,
  PTZ as PTZType
} from 'onvif-nvt';
import { Server } from '../../server';
import { DeviceInfoService } from './DeviceInfoService';

export class OnvifNvtService {
  private device: InstanceType<typeof DeviceType> | null = null;
  private events: InstanceType<typeof EventsType> | null = null;
  private ptz: InstanceType<typeof PTZType> | null = null;

  constructor(private deviceId: number) {}

  public static async probeDevices(timeout: number = 5000): Promise<InstanceType<typeof ProbeType>[]> {
    try {
      const discovery = new Discovery();
      const devices = await discovery.startProbe({ timeout });
      Server.Logs.info(`Discovered ${devices.length} ONVIF devices`);
      return devices;
    } catch (error) {
      Server.Logs.error(`Device discovery failed: ${error}`);
      throw error;
    }
  }

  public async connect(): Promise<void> {
    try {
      const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(this.deviceId);

      Server.Logs.debug(`Connecting to ONVIF device at http://${deviceInfo.ipAddress}:${deviceInfo.onvifPort}`);

      this.device = new DeviceType({
        xaddr: `http://${deviceInfo.ipAddress}:${deviceInfo.onvifPort}/onvif/device_service`,
        user: deviceInfo.rtspUsername,
        pass: deviceInfo.rtspPassword
      });

      await this.device.init();
    } catch (error) {
      Server.Logs.error(`Failed to connect to device ${this.deviceId}: ${error}`);
      throw error;
    }
  }

  public async ptzMove(x: number, y: number, zoom: number): Promise<void> {
    if (!this.ptz) throw new Error('PTZ not initialized');

    await this.ptz.absoluteMove({
      x, y, zoom,
      speed: { x: 1, y: 1, zoom: 1 }
    });
  }

  public async subscribeToEvents(topics: string[]): Promise<void> {
    if (!this.events) throw new Error('Events not initialized');

    const subscription = await this.events.subscribe({
      TopicFilter: {
        TopicExpression: topics,
        MessageContent: 'Message'
      }
    });

    subscription.on('event', (event: any) => {
      this.handleEvent(event);
    });

    Server.Logs.info(`Subscribed to events for device ${this.deviceId}`);
  }

  private handleEvent(event: any): void {
    try {
      const topic = event.topic?._;
      const message = event.message;

      switch (true) {
        case topic?.includes('MotionDetector'):
          this.handleMotionEvent(message);
          break;
        case topic?.includes('ObjectDetector/Person'):
          this.handlePersonEvent(message);
          break;
        case topic?.includes('ObjectDetector/Vehicle'):
          this.handleVehicleEvent(message);
          break;
        default:
          Server.Logs.debug(`Unhandled event topic: ${topic}`);
      }
    } catch (error) {
      Server.Logs.error(`Event handling failed: ${error}`);
    }
  }

  private handleMotionEvent(message: any): void {
    Server.Logs.info(`Motion detected: ${JSON.stringify(message)}`);
  }

  private handlePersonEvent(message: any): void {
    Server.Logs.info(`Person detected: ${JSON.stringify(message)}`);
  }

  private handleVehicleEvent(message: any): void {
    Server.Logs.info(`Vehicle detected: ${JSON.stringify(message)}`);
  }

  public async getPTZDetails(): Promise<any> {
    if (!this.ptz || !this.device) throw new Error('PTZ not initialized');

    const capabilities = await this.device.getCapabilities();
    const nodes = await this.ptz.getNodes();
    const config = await this.ptz.getConfigurations();

    return {
      capabilities: capabilities?.PTZ,
      nodes,
      configurations: config
    };
  }
}

