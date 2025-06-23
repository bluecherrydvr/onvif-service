import { Express } from 'express';
import { DiscoveryController } from '../controllers/DiscoveryController';
import { PTZController } from '../controllers/PTZController';
import { getDeviceRtspUrls } from '../services/onvif/RtspService';
import eventRoutes from './controllers/Events/EventRoutes'; // ✅ default import
import { Logger } from '../utils/Logger';

export function registerRoutes(app: Express) {
  Logger.info('Registering ONVIF service routes');

  // Mount all event-related routes
  app.use('/', eventRoutes);

  // RTSP URL extraction
  app.post('/devices/rtsp', async (req, res) => {
    Logger.info('RTSP URL extraction request received');
    try {
      const urls = await getDeviceRtspUrls(req.body.xaddr, req.body.username, req.body.password);
      Logger.info(`RTSP URLs extracted successfully: ${JSON.stringify(urls)}`);
      res.json(urls);
    } catch (error: any) {
      Logger.error('Failed to extract RTSP URLs:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ONVIF device discovery
  app.get('/devices/discover', (req, res) => {
    Logger.info('Device discovery request received');
    DiscoveryController.discoverDevices(req, res);
  });

  // PTZ Routes
  app.get('/devices/:deviceId/ptz/status', PTZController.getStatus);
  app.post('/devices/:deviceId/ptz/relative', PTZController.relativeMove);
  app.post('/devices/:deviceId/ptz/absolute', PTZController.absoluteMove);
  app.post('/devices/:deviceId/ptz/continuous', PTZController.continuousMove);
  app.post('/devices/:deviceId/ptz/stop', PTZController.stop);
  app.get('/devices/:deviceId/ptz/capabilities', PTZController.getCapabilities);
  app.get('/devices/:deviceId/ptz/presets', PTZController.getPresets);
  app.post('/devices/:deviceId/ptz/presets/goto', PTZController.gotoPreset);
  app.post('/devices/:deviceId/ptz/presets/set', PTZController.setPreset);
  app.post('/devices/:deviceId/ptz/presets/remove', PTZController.removePreset);
  app.post('/devices/:deviceId/ptz/home/goto', PTZController.gotoHomePosition);
  app.post('/devices/:deviceId/ptz/home/set', PTZController.setHomePosition);
  app.get('/devices/:deviceId/ptz/nodes', PTZController.getPTZNodes);

  Logger.info('ONVIF service routes registered successfully');
}

