import { Cam } from 'onvif';
import { Server } from '../../server';

export interface RtspUrlResult {
  profileName: string;
  rtspUri: string;
}

export class CustomRtspUrlService {
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
  public static async getRtspUrls(
    ipAddress: string,
    username: string,
    password: string,
    onvifPort: number = 80
  ): Promise<RtspUrlResult[]> {
    return new Promise((resolve, reject) => {
      new Cam(
        {
          hostname: ipAddress,
          port: onvifPort,
          username: username,
          password: password,
          timeout: 5000,
        },
        (err, cam) => {
          if (err) {
            Server.Logs.error(
              `Failed to connect to camera at ${ipAddress}:${onvifPort}: ${err}`
            );
            return reject(err);
          }

          // Retrieve camera media profiles.
          cam.getProfiles((profileErr: Error, profiles: any[]) => {
            if (profileErr) {
              Server.Logs.error(
                `Error retrieving profiles for camera at ${ipAddress}:${onvifPort}: ${profileErr}`
              );
              return reject(profileErr);
            }

            // For each profile, fetch the RTSP stream URI.
            const rtspUrlPromises = profiles.map((profile) => {
              return new Promise<RtspUrlResult>((res, rej) => {
                cam.getStreamUri(
                  { protocol: 'RTSP', profileToken: profile.token },
                  (streamErr: Error, stream: any) => {
                    if (streamErr) {
                      return rej(streamErr);
                    }
                    res({ profileName: profile.name, rtspUri: stream.uri });
                  }
                );
              });
            });

            Promise.all(rtspUrlPromises)
              .then((urls) => resolve(urls))
              .catch((streamUriErr) => {
                Server.Logs.error(
                  `Error retrieving RTSP URLs for camera at ${ipAddress}:${onvifPort}: ${streamUriErr}`
                );
                reject(streamUriErr);
              });
          });
        }
      );
    });
  }
}
