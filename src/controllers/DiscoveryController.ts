import dgram from 'dgram';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { buildProbeMessage, parseProbeMatch } from '../utils/discoveryUtils';

// Use CommonJS require for node-onvif since it has no types
const Onvif = require('node-onvif');

export class DiscoveryController {
  static async discoverDevices(req: Request, res: Response): Promise<void> {
    // (Optional: if you need to create a device instance, note you must use the methods that node-onvif exposes.)
    // For example, if you wanted to perform a probe using the onvif library itself, you might call:
    // Onvif.startProbe().then(...).catch(...);
    //
    // However, the current implementation uses a UDP probe via dgram.
    
    const socket = dgram.createSocket('udp4');
    const messageId = uuidv4();
    const probeMessage = Buffer.from(buildProbeMessage(messageId), 'utf8');

    const discoveredDevices: any[] = [];

    socket.on('message', async (msg: Buffer) => {
      const xml = msg.toString('utf8');
      try {
        const parsed = await parseProbeMatch(xml);
        discoveredDevices.push(...parsed);
      } catch (err) {
        console.error('Failed to parse discovery response:', err);
      }
    });

    socket.on('error', (err) => {
      console.error('Socket error:', err);
    });

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.setMulticastTTL(128);
      socket.send(
        probeMessage,
        0,
        probeMessage.length,
        3702,
        '239.255.255.250',
        (err) => {
          if (err) {
            console.error('Failed to send discovery probe:', err);
          }
        }
      );
    });

    // Wait for responses to arrive, then close the socket and return the devices.
    setTimeout(() => {
      socket.close();

      // Deduplicate devices based on normalized address
      const unique = new Map<string, any>();
      for (const device of discoveredDevices) {
        const normalized = device.address.replace(/^urn:/, '').trim();
        if (!unique.has(normalized)) {
          unique.set(normalized, device);
        }
      }

      res.json({ devices: Array.from(unique.values()) });
    }, 8000);
  }
}

