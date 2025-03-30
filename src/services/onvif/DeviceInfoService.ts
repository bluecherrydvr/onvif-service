import { Server } from '../../server';
import { Register as RegisterDevices, Devices } from '../../models/db/Device';


export interface DeviceConnectionInfo {
  id: number;
  ipAddress: string;
  onvifPort: number;
  rtspUsername: string;
  rtspPassword: string;
}

export interface OnvifConfig {
  onvif_port: number;
  onvif_events_enabled: boolean;
  rtsp_username: string;
  rtsp_password: string;
}

export class DeviceInfoService {
  // Ensure model is initialized
  private static initialized = false;

  private static init() {
    if (!this.initialized) {
      RegisterDevices();
      this.initialized = true;
    }
  }

  private static decodeHexPassword(hexPassword: string | null | undefined): string {
    if (!hexPassword) return '';
    const hex = hexPassword.startsWith('0x') ? hexPassword.slice(2) : hexPassword;
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }

  public static async getDeviceConnectionInfo(deviceId: number): Promise<DeviceConnectionInfo> {
    try {
      this.init(); // ensure Devices model is initialized

      const device = await Devices.findOne({ where: { id: deviceId } });
      if (!device) throw new Error(`Device with ID ${deviceId} not found`);

      let password = '';
      if (typeof device.rtsp_password === 'string') {
        password = device.rtsp_password.startsWith('0x')
          ? this.decodeHexPassword(device.rtsp_password)
          : device.rtsp_password;
      }

      return {
        id: device.id,
        ipAddress: device.ip_address || '',
        onvifPort: device.onvif_port || 80,
        rtspUsername: device.rtsp_username || '',
        rtspPassword: device.rtsp_password
      };
    } catch (error: any) {
      Server.Logs.error(`Failed to get device connection info: ${error.stack || error.message}`);
      throw error;
    }
  }

  public static validateConnectionInfo(info: Partial<DeviceConnectionInfo>): boolean {
    return !!(
      info &&
      typeof info.ipAddress === 'string' &&
      typeof info.rtspUsername === 'string' &&
      typeof info.rtspPassword === 'string' &&
      typeof info.onvifPort === 'number'
    );
  }
}


