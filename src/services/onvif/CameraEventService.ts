import { Cam } from 'onvif';
import { DeviceInfoService } from './DeviceInfoService';
import { Server } from '../../server';

export class CameraEventService {
    public static async getEventTypes(deviceId: number): Promise<any> {
        try {
            // Get device connection info from database
            const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(deviceId);
            
            // Validate the connection info
            if (!DeviceInfoService.validateConnectionInfo(deviceInfo)) {
                throw new Error(`Invalid device connection info for device ${deviceId}`);
            }

            // Connect to the camera
            const camera = await this.connectToCamera({
                hostname: deviceInfo.ipAddress,
                username: deviceInfo.rtspUsername,
                password: deviceInfo.rtspPassword,
                port: deviceInfo.onvifPort
            });

            // Get the supported events
            const events = await this.getSupportedEvents(camera);
            return {
                deviceId,
                events
            };
        } catch (error) {
            Server.Logs.error(`Failed to get event types: ${error}`);
            throw error;
        }
    }

    private static connectToCamera(config: {
        hostname: string,
        username: string,
        password: string,
        port: number
    }): Promise<Cam> {
        return new Promise((resolve, reject) => {
            new Cam({
                hostname: config.hostname,
                username: config.username,
                password: config.password,
                port: config.port,
                timeout: 5000
            }, (error: Error | null, camera?: Cam) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (!camera) {
                    reject(new Error('Camera connection failed'));
                    return;
                }
                resolve(camera);
            });
        });
    }

    private static getSupportedEvents(camera: Cam): Promise<any> {
        return new Promise((resolve, reject) => {
            camera.getEventProperties((error: Error | null, events: any) => {
                if (error) {
                    Server.Logs.error(`Failed to get supported events: ${error}`);
                    reject(error);
                    return;
                }
                resolve(events);
            });
        });
    }
}

