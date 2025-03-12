import { Server } from '../../server';
import { Devices } from '../../models/db/Device';

interface DeviceConnectionInfo {
    id: number;
    ipAddress: string;
    onvifPort: number;
    rtspUsername: string;
    rtspPassword: string;
}

export class DeviceInfoService {
    /**
     * Get connection info for a single device
     */
    public static async getDeviceConnectionInfo(deviceId: number): Promise<DeviceConnectionInfo> {
        try {
            const device = await Devices.findOne({
                where: { id: deviceId }
            });

            if (!device) {
                throw new Error(`Device with ID ${deviceId} not found`);
            }

            return {
                id: device.id,
                ipAddress: device.device_uri || '', // device_uri contains IP address
                onvifPort: device.onvif_port || 80,
                rtspUsername: device.rtsp_username || '',
                rtspPassword: device.rtsp_password || ''
            };
        } catch (error) {
            Server.Logs.error(`Failed to get device connection info: ${error}`);
            throw error;
        }
    }

    /**
     * Get connection info for all devices
     */
    public static async getAllDevicesConnectionInfo(): Promise<DeviceConnectionInfo[]> {
        try {
            const devices = await Devices.findAll({
                where: {
                    disabled: false,  // Only get enabled devices
                    onvif_events_enabled: true  // Only get devices with ONVIF enabled
                }
            });

            return devices.map(device => ({
                id: device.id,
                ipAddress: device.device_uri || '',
                onvifPort: device.onvif_port || 80,
                rtspUsername: device.rtsp_username || '',
                rtspPassword: device.rtsp_password || ''
            }));
        } catch (error) {
            Server.Logs.error(`Failed to get all devices connection info: ${error}`);
            throw error;
        }
    }

    /**
     * Validate device connection info
     */
    public static validateConnectionInfo(info: DeviceConnectionInfo): boolean {
        if (!info.ipAddress) {
            Server.Logs.error(`Device ${info.id} has no IP address`);
            return false;
        }

        if (!info.onvifPort) {
            Server.Logs.error(`Device ${info.id} has no ONVIF port`);
            return false;
        }

        // Basic IP address format validation
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        if (!ipRegex.test(info.ipAddress)) {
            Server.Logs.error(`Device ${info.id} has invalid IP address format: ${info.ipAddress}`);
            return false;
        }

        return true;
    }
}

// Usage in ONVIF event service:
// src/services/onvif/EventInterface.ts

import { DeviceInfoService } from './DeviceInfoService';

export class OnvifEventInterface {
    private pythonProcess: any;
    
    constructor(private deviceId: number) {}

    async initialize(): Promise<void> {
        try {
            // Get device connection info
            const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(this.deviceId);
            
            // Validate connection info
            if (!DeviceInfoService.validateConnectionInfo(deviceInfo)) {
                throw new Error(`Invalid device connection info for device ${this.deviceId}`);
            }

            // Use the connection info to start the Python ONVIF service
            this.pythonProcess = spawn('python3', [
                'src/services/onvif/event_service.py',
                'subscribe',
                JSON.stringify({
                    host: deviceInfo.ipAddress,
                    port: deviceInfo.onvifPort,
                    username: deviceInfo.rtspUsername,
                    password: deviceInfo.rtspPassword
                })
            ]);

            // Set up event handlers
            this.setupEventHandlers();

        } catch (error) {
            Server.Logs.error(`Failed to initialize ONVIF interface: ${error}`);
            throw error;
        }
    }

    private setupEventHandlers(): void {
        this.pythonProcess.stdout.on('data', (data) => {
            try {
                const event = JSON.parse(data);
                Server.Logs.debug(`Received ONVIF event: ${JSON.stringify(event)}`);
                // Handle event processing
            } catch (e) {
                Server.Logs.error(`Failed to parse event data: ${e}`);
            }
        });

        this.pythonProcess.stderr.on('data', (data) => {
            Server.Logs.error(`Python ONVIF error: ${data}`);
        });
    }

    stop(): void {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
    }
}

public static validateOnvifConfig(config: OnvifConfig): boolean {
    if (!config.onvif_port || config.onvif_port < 0 || config.onvif_port > 65535) {
        Server.Logs.error('Invalid ONVIF port');
        return false;
    }

    if (config.onvif_events_enabled && (!config.rtsp_username || !config.rtsp_password)) {
        Server.Logs.error('RTSP credentials required for ONVIF events');
        return false;
    }

    return true;
}

