import { Request, Response } from 'express';
import { Cam } from 'onvif';
import { Models } from '../models/Models';

async function getCamera(deviceId: number): Promise<any> {
  const device = await Models.Devices.findOne({ where: { id: deviceId } });

  if (!device) {
    throw new Error('Device not found');
  }

  const [ip] = device.device.toString().split('|'); // discard the port
  const port = device.onvif_port || 80; // fallback if ONVIF port is null

  return new Promise((resolve, reject) => {
    new Cam(
      {
        hostname: ip,
        port,
        username: device.rtsp_username.toString(),
        password: device.rtsp_password.toString(),
      },
      function (err) {
        if (err) return reject(err);
        resolve(this);
      }
    );
  });
}


export class PTZController {
  static async absoluteMove(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const { x, y, zoom } = req.body;
      const cam = await getCamera(deviceId);

      cam.absoluteMove({ x, y, zoom }, (err: any) => {
        if (err) {
          console.log('absoluteMove error:', err);
          res.status(500).json({ error: 'Failed to move' });
        } else {
          res.json({ message: 'Moved to absolute position' });
        }
      });
    } catch (err) {
      console.log('absoluteMove exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async continuousMove(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const { x, y, zoom, timeout } = req.body;
      const cam = await getCamera(deviceId);

      cam.continuousMove({ x, y, zoom }, (err: any) => {
        if (err) {
          console.log('continuousMove error:', err);
          return res.status(500).json({ error: 'Failed to move' });
        }
        setTimeout(() => {
          cam.stop(() => {});
        }, timeout || 3000);
        res.json({ message: 'Camera moving continuously' });
      });
    } catch (err) {
      console.log('continuousMove exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async stop(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const cam = await getCamera(deviceId);

      cam.stop((err: any) => {
        if (err) {
          console.log('stop error:', err);
          res.status(500).json({ error: 'Failed to stop' });
        } else {
          res.json({ message: 'Camera movement stopped' });
        }
      });
    } catch (err) {
      console.log('stop exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPresets(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const cam = await getCamera(deviceId);

      cam.getPresets({}, (err: any, presets: any) => {
        if (err) {
          console.log('getPresets error:', err);
          res.status(500).json({ error: 'Failed to get presets' });
        } else {
          res.json({ presets });
        }
      });
    } catch (err) {
      console.log('getPresets exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async gotoPreset(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const { preset } = req.body;
      const cam = await getCamera(deviceId);

      cam.gotoPreset({ preset }, (err: any) => {
        if (err) {
          console.log('gotoPreset error:', err);
          res.status(500).json({ error: 'Failed to go to preset' });
        } else {
          res.json({ message: `Moved to preset ${preset}` });
        }
      });
    } catch (err) {
      console.log('gotoPreset exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async setPreset(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const { name } = req.body;
      const cam = await getCamera(deviceId);

      cam.setPreset({ presetName: name }, (err: any, result: any) => {
        if (err) {
          console.log('setPreset error:', err);
          res.status(500).json({ error: 'Failed to set preset' });
        } else {
          res.json({ message: 'Preset saved', result });
        }
      });
    } catch (err) {
      console.log('setPreset exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getStatus(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const cam = await getCamera(deviceId);

      cam.getStatus((err: any, status: any) => {
        if (err) {
          console.log('getStatus error:', err);
          res.status(500).json({ error: 'Failed to get status' });
        } else {
          res.json({ status });
        }
      });
    } catch (err) {
      console.log('getStatus exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async relativeMove(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const { x, y, zoom } = req.body;
      const cam = await getCamera(deviceId);

      cam.relativeMove({ x, y, zoom }, (err: any) => {
        if (err) {
          console.log('relativeMove error:', err);
          res.status(500).json({ error: 'Failed to move' });
        } else {
          res.json({ message: 'Relative move executed' });
        }
      });
    } catch (err) {
      console.log('relativeMove exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

static async getCapabilities(req: Request, res: Response) {
  try {
    const deviceId = parseInt(req.params.deviceId);
    const cam = await getCamera(deviceId);

    cam.getCapabilities((err: any, capabilities: any) => {
      if (err) {
        console.log('getCapabilities error:', err);
        return res.status(500).json({ error: 'Failed to get capabilities' });
      }

      console.log('Camera Capabilities:', capabilities); // 👈 Add this
      res.json(capabilities); // 👈 Return the actual capabilities, not { capabilities }
    });
  } catch (err) {
    console.log('getCapabilities exception:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
}
