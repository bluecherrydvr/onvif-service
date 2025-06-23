import { Request, Response } from 'express';
import { Server } from '../server';

// Require node-onvif since it has no types
const Onvif = require('node-onvif');

export class OnvifController {
    static async discoverDevices(_req: Request, res: Response): Promise<void> {

    try {
      const devices = await Onvif.startProbe();

      const results = devices.map((dev: any) => ({
        urn: dev.urn,
        name: dev.name || '',
        address: dev.address,
        xaddrs: dev.xaddrs,
        types: dev.types
      }));

      res.status(200).json({ devices: results });
    } catch (err: any) {
      Server.Logs.error(`Discovery error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }
}
