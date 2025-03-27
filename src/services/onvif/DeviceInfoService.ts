import { Server } from '../../server';
import { Devices } from '../../models/db/Device';

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
        rtspPassword: password
      };
    } catch (error) {
      Server.Logs.error(`Failed to get device connection info: ${error}`);
      throw error;
    }
  }

  public static validateConnectionInfo(info: DeviceConnectionInfo): boolean {
    Server.Logs.debug(`Full connection details for device ${info.id}:`, info);

    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!info.ipAddress || !ipRegex.test(info.ipAddress)) {
      Server.Logs.error(`Device ${info.id} has invalid or missing IP: ${info.ipAddress}`);
      return false;
    }

    if (!info.onvifPort || info.onvifPort <= 0 || info.onvifPort > 65535) {
      Server.Logs.error(`Device ${info.id} has invalid ONVIF port: ${info.onvifPort}`);
      return false;
    }

    return true;
  }
}

