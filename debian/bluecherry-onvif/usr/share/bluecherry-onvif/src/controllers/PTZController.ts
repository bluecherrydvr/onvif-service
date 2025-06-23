import { Request, Response } from 'express';
import { Cam } from 'onvif';
import { Models } from '../models/Models';

// Enhanced type definitions from bluecherry-api
interface OnvifStatus {
    position: {
        x: number;
        y: number;
        zoom: number;
    };
    moveStatus?: {
        panTilt: string;
        zoom: string;
    };
    utcTime?: string;
}

interface Velocity {
    x: number;
    y: number;
    zoom: number;
}

// Helper function to connect to the camera with retry logic from bluecherry-api
async function getCamera(deviceId: number, retryAttempts = 3): Promise<Cam> {
    const device = await Models.Devices.findOne({ where: { id: deviceId, disabled: false } });

    if (!device || !device.device) {
        throw new Error('Device not found or device data is missing');
    }
    
    // The device field contains IP, port, and stream path separated by '|'
    const [ipAddress] = device.device.toString('utf-8').split('|');

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        try {
            return await new Promise((resolve, reject) => {
                const cam = new Cam({
                    hostname: ipAddress,
                    username: device.rtsp_username.toString('utf-8'),
                    password: device.rtsp_password.toString('utf-8'),
                    port: device.onvif_port || 80,
                    timeout: 10000
                }, function(this: Cam, err: Error | null) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(this);
                    }
                });
            });
        } catch (error) {
            lastError = error as Error;
            console.warn(`PTZ connection attempt ${attempt} for device ${deviceId} failed. Retrying...`);
            if (attempt < retryAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000)); // wait 1s before retrying
            }
        }
    }
    throw new Error(`Failed to connect to PTZ camera after ${retryAttempts} attempts. Last error: ${lastError?.message}`);
}


export class PTZController {
  static async absoluteMove(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const { x, y, zoom } = req.body;
      const cam = await getCamera(deviceId);

      cam.absoluteMove({ x, y, zoom }, (err: Error | null) => {
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

  // Enhanced continuous movement from bluecherry-api
  static async continuousMove(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const { direction, duration, panSpeed, tiltSpeed, zoomSpeed } = req.body;
      const cam = await getCamera(deviceId);

      const normalizedPanSpeed = Math.min(Math.max(panSpeed || 0.5, 0), 1);
      const normalizedTiltSpeed = Math.min(Math.max(tiltSpeed || 0.5, 0), 1);
      const normalizedZoomSpeed = Math.min(Math.max(zoomSpeed || 0.5, 0), 1);

      const velocity: Velocity = { x: 0.0, y: 0.0, zoom: 0.0 };
      switch (direction) {
        case 'up': velocity.y = normalizedTiltSpeed; break;
        case 'down': velocity.y = -normalizedTiltSpeed; break;
        case 'left': velocity.x = -normalizedPanSpeed; break;
        case 'right': velocity.x = normalizedPanSpeed; break;
        case 'zoom_in': velocity.zoom = normalizedZoomSpeed; break;
        case 'zoom_out': velocity.zoom = -normalizedZoomSpeed; break;
        default:
          return res.status(400).json({ error: 'Invalid direction' });
      }

      console.log('Sending continuousMove with velocity:', velocity);

      cam.continuousMove(velocity, (err: Error | null) => {
          if (err) {
              console.log('continuousMove error:', err);
              return res.status(500).json({ error: 'Failed to start continuous move' });
          }
          
          setTimeout(() => {
              cam.stop((stopErr: Error | null) => {
                  if (stopErr) {
                      console.log('stop error after continuous move:', stopErr);
                  } else {
                      console.log(`Stopped movement after ${duration || 2} seconds.`);
                  }
              });
          }, (duration || 2) * 1000);
          
          res.json({ message: 'Moving continuously' });
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

      cam.stop((err: Error | null) => {
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

      cam.getPresets({}, (err: Error | null, presets: any) => {
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

      cam.gotoPreset({ preset }, (err: Error | null) => {
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
      const { name, token } = req.body; // Can set by name or token
      const cam = await getCamera(deviceId);

      cam.setPreset({ presetName: name, presetToken: token }, (err: Error | null, result?: any) => {
        if (err) {
          console.log('setPreset error:', err);
          res.status(500).json({ error: 'Failed to set preset' });
        } else {
          res.json({ message: 'Preset saved', ...(result && { result }) });
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

      cam.getStatus((err: Error | null, status: OnvifStatus) => {
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

      cam.relativeMove({ x, y, zoom }, (err: Error | null) => {
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

      cam.getCapabilities((err: Error | null, capabilities: any) => {
        if (err) {
          console.log('getCapabilities error:', err);
          return res.status(500).json({ error: 'Failed to get capabilities' });
        }
        res.json(capabilities);
      });
    } catch (err) {
      console.log('getCapabilities exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPTZNodes(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const cam = await getCamera(deviceId);

      cam.getNodes((err: Error | null, nodes: any) => {
        if (err) {
          console.log('getPTZNodes error:', err);
          return res.status(500).json({ error: 'Failed to get PTZ nodes' });
        }
        res.json(nodes);
      });
    } catch (err) {
      console.log('getPTZNodes exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async getPTZConfiguration(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const cam = await getCamera(deviceId);

      cam.getPTZConfiguration((err: Error | null, config: any) => {
        if (err) {
          console.log('getPTZConfiguration error:', err);
          return res.status(500).json({ error: 'Failed to get PTZ configuration' });
        }
        res.json(config);
      });
    } catch (err) {
      console.log('getPTZConfiguration exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // New functions from bluecherry-api
  static async gotoHomePosition(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const cam = await getCamera(deviceId);
      
      cam.gotoHomePosition({}, (err: Error | null) => {
        if (err) {
          console.log('gotoHomePosition error:', err);
          return res.status(500).json({ error: 'Failed to go to home position' });
        }
        res.json({ message: 'Moving to home position' });
      });
    } catch (err) {
      console.log('gotoHomePosition exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async setHomePosition(req: Request, res: Response) {
    try {
      const deviceId = parseInt(req.params.deviceId);
      const cam = await getCamera(deviceId);
      
      cam.setHomePosition({}, (err: Error | null) => {
        if (err) {
          console.log('setHomePosition error:', err);
          return res.status(500).json({ error: 'Failed to set home position' });
        }
        res.json({ message: 'Home position set' });
      });
    } catch (err) {
      console.log('setHomePosition exception:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  static async removePreset(req: Request, res: Response) {
    try {
        const deviceId = parseInt(req.params.deviceId);
        const { preset } = req.body;
        const cam = await getCamera(deviceId);

        cam.removePreset({ preset }, (err: Error | null) => {
            if (err) {
                console.log('removePreset error:', err);
                return res.status(500).json({ error: 'Failed to remove preset' });
            }
            res.json({ message: `Preset ${preset} removed` });
        });
    } catch (err) {
        console.log('removePreset exception:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
  }
}
