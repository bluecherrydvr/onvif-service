import { OnvifDevice } from 'node-onvif-ts';
import { Server } from '../../server';

export interface StreamProfile {
  profileName: string;
  profileToken: string;
  rtspUrl: string;
}

export async function getDeviceRtspUrls(
  xaddr: string,
  username?: string,
  password?: string
): Promise<StreamProfile[]> {
  try {
    const urlObj = new URL(xaddr);
    const device = new OnvifDevice({
      address: urlObj.hostname,
      user: username || '',
      pass: password || ''
    });

    Server.Logs.debug('Attempting to initialize ONVIF device:', xaddr);

    try {
      await device.init();
    } catch (initError: any) {
      Server.Logs.error('Device initialization failed:', initError);
      throw new Error(`Failed to initialize the device: ${initError.message}`);
    }

    let profiles;
    try {
      // Make sure to await if getProfileList returns a Promise.
      profiles = await device.getProfileList();
      if (!profiles || profiles.length === 0) {
        throw new Error('No profiles found on device');
      }
    } catch (profileError: any) {
      Server.Logs.error('Failed to get device profiles:', profileError);
      throw new Error(`Failed to get device profiles: ${profileError.message}`);
    }

    const rtspUrls = profiles.map((profile: any) => {
      const authPart = username ? `${username}:${password}@` : '';
      const portPart = urlObj.port ? `:${urlObj.port}` : '';
      const rtspUrl = `rtsp://${authPart}${urlObj.hostname}${portPart}/Profile${profile.token}`;
      return {
        profileName: profile.name || 'Default',
        profileToken: profile.token,
        rtspUrl: rtspUrl
      };
    });

    Server.Logs.debug('Retrieved RTSP URLs:', rtspUrls);
    return rtspUrls;
    
  } catch (error: any) {
    Server.Logs.error(`Failed to get RTSP URLs: ${error.message}`);
    throw error;
  }
}

