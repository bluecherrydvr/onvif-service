import Onvif from 'node-onvif';

export async function discoverDevices(): Promise<any[]> {
  try {
    // TypeScript may not recognize startProbe unless declared properly
    const deviceList = await (Onvif as any).startProbe();
    return deviceList;
  } catch (err: unknown) {
    throw new Error(`Device discovery failed: ${(err as Error).message}`);
  }
}
