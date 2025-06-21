import { Devices } from '../models/db/Device';
import { subscribeToEvents, deviceWrappers } from './OnvifEventHandler';
import { Logger } from '../utils/Logger';
import { OnvifDeviceWrapper } from './OnvifDeviceWrapper';

export class WatcherService {
  private static instance: WatcherService;
  private subscriptions: Map<number, NodeJS.Timeout>;
  private readonly POLLING_INTERVAL = 15000; // 15 seconds
  private deviceWrappers = deviceWrappers; // Reference to the deviceWrappers map

  private constructor() {
    this.subscriptions = new Map();
  }

  public static getInstance(): WatcherService {
    if (!WatcherService.instance) {
      WatcherService.instance = new WatcherService();
    }
    return WatcherService.instance;
  }

  public static start(): void {
    WatcherService.getInstance().startWatching();
  }

  /**
   * Start watching for ONVIF events on all devices that have events enabled
   */
  public startWatching(): void {
    if (this.subscriptions.size > 0) {
      return; // Already watching
    }

    // Initial poll
    this.pollDevices();
  }

  /**
   * Stop watching for ONVIF events
   */
  public stopWatching(): void {
    // Cleanup all active subscriptions
    for (const [deviceId, subscription] of this.subscriptions) {
      clearInterval(subscription);
    }
    this.subscriptions.clear();
  }

  /**
   * Poll all devices that have ONVIF events enabled
   */
  public async pollDevices(): Promise<void> {
    try {
      Logger.info('Starting device polling...');
      
      let devices: Array<Devices | { 
        id: number;
        ip_address: string;
        onvif_port: number;
        rtsp_username: string;
        rtsp_password: string;
        onvif_events_enabled: boolean;
        disabled: boolean;
      }> = [];

      try {
        const dbDevices = await Devices.findAll({
          where: {
            onvif_events_enabled: true,
            disabled: false,
          },
        });
        devices = dbDevices;
        Logger.info(`Found ${devices.length} enabled ONVIF devices`);
      } catch (dbError) {
        Logger.warn('Database query failed, this is expected if running without database initialization:', dbError);
        // If database is not available, check existing device wrappers
        devices = Array.from(this.deviceWrappers.entries()).map(([id, wrapper]) => {
          const info = wrapper.getDeviceInfo();
          return {
            id,
            ip_address: info.ip,
            onvif_port: info.port,
            rtsp_username: info.username,
            rtsp_password: info.password,
            onvif_events_enabled: true,
            disabled: false
          };
        });
        Logger.info(`Using ${devices.length} existing device wrappers`);
      }

      for (const device of devices) {
        if (!this.subscriptions.has(device.id)) {
          Logger.info(`Setting up subscription for device ${device.id}`);
          await this.subscribeToDeviceEvents(device as Devices);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : '';
      Logger.error('Error polling devices:', { message: errorMessage, stack: errorStack });
    }
  }

  /**
   * Subscribe to events for a specific device
   */
  private async subscribeToDeviceEvents(device: Devices): Promise<void> {
    try {
      // Set up a polling interval to check if the device is still connected
      const subscription = setInterval(async () => {
        await this.checkDeviceConnection(device.id);
      }, this.POLLING_INTERVAL);

      this.subscriptions.set(device.id, subscription);
      
      // Initial subscription
      await this.setupEventSubscription(device);
    } catch (error) {
      Logger.error(`Error subscribing to device events for device ${device.id}:`, error);
    }
  }

  /**
   * Set up a continuous event subscription for a device
   */
  private async setupEventSubscription(device: Devices): Promise<void> {
    try {
      if (!device.device) {
        Logger.error(`Device ${device.id} has no device data`);
        return;
      }
      
      const [ipAddress] = device.device.toString('utf-8').split('|');
      const username = device.rtsp_username.toString('utf-8');
      const password = device.rtsp_password.toString('utf-8');

      await subscribeToEvents(
        ipAddress,
        device.onvif_port,
        username,
        password,
        device.id
      );
      
      Logger.info(`Successfully set up continuous event subscription for device ${device.id}`);
    } catch (error) {
      Logger.error(`Error setting up event subscription for device ${device.id}:`, error);
    }
  }

  /**
   * Check if a device is still connected and reconnect if needed
   */
  private async checkDeviceConnection(deviceId: number): Promise<void> {
    try {
      Logger.debug(`Checking connection for device ${deviceId}`);
      
      // Get the device wrapper
      const deviceWrapper = this.deviceWrappers.get(deviceId);
      if (!deviceWrapper) {
        Logger.error(`Device ${deviceId} not found in device wrappers`);
        return;
      }
      
      // Check if the device is connected
      const isConnected = await deviceWrapper.isConnected();
      
      if (!isConnected) {
        Logger.info(`Device ${deviceId} is disconnected, attempting to reconnect`);
        await deviceWrapper.connect();
        await deviceWrapper.startEventSubscription();
      } else {
        Logger.debug(`Connection check completed for device ${deviceId}`);
      }
    } catch (error) {
      Logger.error(`Error checking connection for device ${deviceId}:`, error);
    }
  }
}



