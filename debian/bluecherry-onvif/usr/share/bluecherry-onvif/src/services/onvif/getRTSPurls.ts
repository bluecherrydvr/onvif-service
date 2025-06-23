import { Cam } from 'onvif';
import { Logger } from '../../utils/Logger';

/**
 * Connects to an ONVIF camera using the provided connection parameters and retrieves RTSP URLs
 * for each available media profile.
 *
 * @param ipAddress - The camera's IP address.
 * @param username - The username for camera authentication.
 * @param password - The password for camera authentication.
 * @param onvifPort - The port used for ONVIF communication (defaults to 80 if not provided).
 * @returns A Promise resolving to an array of objects with profile names and RTSP URIs.
 */

interface RTSPUrl {
  profileName: string;
  url: string;
}

export function getRTSPUrls(
  ip: string,
  port: number,
  username: string,
  password: string
): Promise<RTSPUrl[]> {
  return new Promise((resolve, reject) => {
    const cam = new Cam({
      hostname: ip,
      port,
      username,
      password,
      timeout: 10000
    });

    cam.connect((err) => {
      if (err) {
        Logger.error(`Failed to connect to camera: ${err.message}`);
        return reject(err);
      }

      cam.getProfiles((err, profiles) => {
        if (err) {
          Logger.error(`Failed to get profiles: ${err.message}`);
          return reject(err);
        }

        if (!profiles || !Array.isArray(profiles)) {
          Logger.error('No profiles returned from camera');
          return reject(new Error('No profiles returned from camera'));
        }

        const rtspUrls: RTSPUrl[] = [];
        let completedRequests = 0;

        profiles.forEach((profile: any) => {
          cam.getStreamUri({ profileToken: profile.token }, (err, uri) => {
            completedRequests++;

            if (err) {
              Logger.error(`Failed to get stream URI for profile ${profile.name}: ${err.message}`);
            } else if (uri) {
              rtspUrls.push({
                profileName: profile.name,
                url: uri
              });
            }

            if (completedRequests === profiles.length) {
              if (rtspUrls.length === 0) {
                reject(new Error('No RTSP URLs found'));
              } else {
                resolve(rtspUrls);
              }
            }
          });
        });
      });
    });
  });
}
