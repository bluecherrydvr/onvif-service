import { Cam } from 'onvif';
import { Logger } from '../../utils/Logger';

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
      username,
      password,
      port,
      timeout: 10000
    }, function(err) {
      if (err) {
        Logger.error('Failed to connect to camera:', err.message || err);
        return reject(err);
      }
      cam.getProfiles((err, profiles) => {
        if (err || !profiles || !Array.isArray(profiles) || profiles.length === 0) {
          Logger.error('Failed to get profiles:', err ? err.message : 'No profiles returned');
          return reject(new Error('No profiles found'));
        }
        let completed = 0;
        const results: RTSPUrl[] = [];
        profiles.forEach((profile: any) => {
          cam.getStreamUri({ profileToken: profile.token }, (err, uri) => {
            completed++;
            let streamUrl = '';
            if (!err && uri) {
              if (typeof uri === 'string') {
                streamUrl = uri;
              } else if (typeof uri === 'object' && (uri as any).uri) {
                streamUrl = (uri as any).uri;
              }
            }
            if (streamUrl) {
              results.push({ profileName: profile.name, url: streamUrl });
            } else {
              Logger.error(`Failed to get stream URI for profile ${profile.name}:`, err ? err.message : 'No URI');
            }
            if (completed === profiles.length) {
              if (results.length === 0) {
                return reject(new Error('No RTSP URLs found'));
              }
              resolve(results);
            }
          });
        });
      });
    });
  });
} 