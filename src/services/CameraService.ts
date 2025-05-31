import Devices from '../models/db/Device';

export interface CameraConfig {
  hostname: string;
  username: string;
  password: string;
  port: number;
}

export class CameraService {
  static async getCameraConfig(deviceId: number): Promise<CameraConfig> {
    const device = await Devices.findOne({ where: { id: deviceId } });
    if (!device) throw new Error(`Device ID ${deviceId} not found`);

    return {
      hostname: device.device,
      username: device.rtsp_username,
      password: device.rtsp_password,
      port: 80, // or device.port if you store it
    };
  }
}

