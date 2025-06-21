import { Cam } from 'onvif';

interface OnvifConfig {
  hostname: string;
  username: string;
  password: string;
  port: number;
}

export class OnvifDevice {
  private cam: any;

  constructor(private config: OnvifConfig) {}

  async initialize(): Promise<void> {
    return new Promise((resolve, reject) => {
      const cam = new Cam({
        hostname: this.config.hostname,
        username: this.config.username,
        password: this.config.password,
        port: this.config.port,
      }, (err: any) => {
        if (err) return reject(err);
        this.cam = cam;
        resolve();
      });
    });
  }

  async getSnapshot(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.cam.getSnapshotUri({}, (err: any, result: any) => {
        if (err) return reject(err);
        resolve(result.uri);
      });
    });
  }

}

