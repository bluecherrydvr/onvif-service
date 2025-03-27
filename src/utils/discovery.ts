import Onvif from 'node-onvif';

export async function discoverDevices(): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const devices: any[] = [];

    Onvif.startProbe()
      .then((deviceList) => {
        resolve(deviceList);
      })
      .catch((err) => reject(err));
  });
}

