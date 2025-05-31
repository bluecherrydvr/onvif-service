import { Devices } from '../models/db/Device';

type CameraAuth = {
  hostname: string;
  port: number;
  username: string;
  password: string;
};

function decodeHexString(input: any): string {
  if (!input) return '';

  if (Buffer.isBuffer(input)) {
    input = input.toString('utf8');
  }

  if (typeof input === 'string') {
    try {
      if (input.startsWith('0x')) {
        const first = Buffer.from(input.slice(2), 'hex').toString('utf8');

        // Check if the result is another hex string like "0x..."
        if (first.startsWith('0x')) {
          return Buffer.from(first.slice(2), 'hex').toString('utf8');
        }

        return first;
      }

      return input;
    } catch (e) {
      console.warn('Failed to decode hex string:', input, e);
      return input;
    }
  }

  return String(input);
}


export async function getCameraAuth(deviceId: number): Promise<CameraAuth> {
  const device = await Devices.findOne({ where: { id: deviceId } });
  if (!device) throw new Error('Device not found');

  const values = device.get({ plain: true }) as any;

  const hostname = values.ip_address;
  const port = parseInt(values.onvif_port || '80', 10);

  const username = decodeHexString(values.rtsp_username);
  const password = decodeHexString(values.rtsp_password);

  console.log('Using ONVIF auth for device:', { hostname, port, username, password });


  console.log('Using ONVIF auth for device:', {
    hostname,
    port,
//    username,
//    password
  });

  return {
    hostname,
    port,
    username,
    password
  };

//  return { hostname, port, username, password };
}

