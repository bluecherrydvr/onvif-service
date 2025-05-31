import { Express } from 'express';
//import { CameraEventTypes } from '../controllers/CameraEventTypes';
import { EventController } from './controllers/Events/EventController';
import { DiscoveryController } from '../controllers/DiscoveryController';
import { PTZController } from '../controllers/PTZController';
import { getDeviceRtspUrls } from '../services/onvif/RtspService';
import { getEventTypes } from '../controllers/CameraEventTypes';



export function registerRoutes(app: Express) {
  // Example usage for getting RTSP URLs
  app.post('/devices/rtsp', async (req, res) => {
    try {
      const urls = await getDeviceRtspUrls(req.body.xaddr, req.body.username, req.body.password);
      res.json(urls);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/devices/discover', DiscoveryController.discoverDevices);

//  app.get('/devices/:deviceId/events/types', CameraEventTypes.getEventTypes);
  app.get('/devices/:deviceId/events/types', getEventTypes);

  app.post('/devices/:deviceId/events/start', async (req, res) => {
    try {
      await EventController.subscribeToDeviceEvents(Number(req.params.deviceId));
      res.json({ message: 'Subscribed to device events.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/devices/:deviceId/events/stop', async (req, res) => {
    try {
      await EventController.unsubscribeFromDeviceEvents(Number(req.params.deviceId));
      res.json({ message: 'Unsubscribed from device events.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/devices/:deviceId/ptz/status', PTZController.getStatus);
  app.post('/devices/:deviceId/ptz/relative', PTZController.relativeMove);
  app.post('/devices/:deviceId/ptz/absolute', PTZController.absoluteMove);
  app.post('/devices/:deviceId/ptz/continuous', PTZController.continuousMove);
  app.post('/devices/:deviceId/ptz/stop', PTZController.stop);
  app.get('/devices/:deviceId/ptz/capabilities', PTZController.getCapabilities);
  app.get('/devices/:deviceId/ptz/presets', PTZController.getPresets);
  app.post('/devices/:deviceId/ptz/presets/goto', PTZController.gotoPreset);
  app.post('/devices/:deviceId/ptz/presets/set', PTZController.setPreset);
}

