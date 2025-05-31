import { Cam } from '@agsh/onvif';

export async function getCamInstance(config: {
  hostname: string;
  port: number;
  username: string;
  password: string;
}): Promise<Cam> {
  return new Promise((resolve, reject) => {
    const cam = new Cam(config, function (err) {
      if (err) return reject(err);
      resolve(cam);
    });
  });
}

