import { Request, Response, Router } from 'express';
import { Devices } from '../../../models/db/Device';
import { subscribeToEvents } from '../../../services/OnvifEventHandler';
import { seenEventTopics, extractTypeFromTopic, getLabelFromTopic } from '../../../utils/TopicUtils';
import { Logger } from '../../../utils/Logger';

const router = Router();

/**
 * GET /devices/:id/events/types
 *
 * This endpoint returns the static ONVIF event types (capabilities) for the specified device.
 */
export async function getAvailableEventTypes(req: Request, res: Response): Promise<void> {
  const deviceId = parseInt(req.params.id, 10);
  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'Invalid device ID' });
    return;
  }

  try {
    // Retrieve the device record from the database.
    const device = await Devices.findByPk(deviceId);
    if (!device || !device.device) {
      res.status(404).json({ error: 'Device not found or device data is missing' });
      return;
    }

    // Parse connection details from the device buffer
    const [ipAddress] = device.device.toString('utf-8').split('|');
    const username = device.rtsp_username.toString('utf-8');
    const password = device.rtsp_password.toString('utf-8');
    const port = device.onvif_port;

    // Helper to flatten ONVIF topicSet into array of {type, label, fullTopic}
    function flattenTopics(node: any, path: string = '', out: any[] = []) {
      for (const key in node) {
        if (key === '$' || key === 'messageDescription' || key === 'data' || key === 'source') continue;
        const child = node[key];
        const newPath = path ? `${path}/${key}` : key;
        if (child && typeof child === 'object' && child.$ && child.$['wstop:topic']) {
          // Map ONVIF topic to a friendly type/label
          let type = key.toLowerCase();
          let label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()).replace('Alarm', ' Detection').trim();
          if (type === 'motionalarm') label = 'Motion Detection';
          if (type === 'vehicledetect') label = 'Vehicle Detection';
          if (type === 'peopledetect' || type === 'persondetect') label = 'Person Detection';
          out.push({ type, label, fullTopic: newPath });
        }
        if (typeof child === 'object') {
          flattenTopics(child, newPath, out);
        }
      }
      return out;
    }

    // Query ONVIF event properties for static topic set
    let eventProperties: any = null;
    try {
      const Cam = require('onvif').Cam;
      const cam = new Cam({
        hostname: ipAddress,
        port,
        username,
        password,
        timeout: 10000
      });
      await new Promise<void>((resolve, reject) => {
        cam.connect((err: any) => {
          if (err) return reject(err);
          cam.getEventProperties((err: any, properties: any) => {
            if (err) return reject(err);
            eventProperties = properties;
            resolve();
          });
        });
      });
    } catch (err) {
      Logger.error('Failed to get ONVIF event properties:', err);
      res.status(500).json({ error: 'Failed to get ONVIF event properties', details: err && err.message });
      return;
    }

    if (!eventProperties || !eventProperties.topicSet) {
      res.status(500).json({ error: 'No ONVIF event topic set found' });
      return;
    }

    const supportedEvents = flattenTopics(eventProperties.topicSet);
    Logger.debug(`Supported ONVIF event types: ${JSON.stringify(supportedEvents)}`);
    res.json({ supportedEvents });
  } catch (error) {
    Logger.error('Failed to fetch event types:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
}

/**
 * GET /devices/:id/events/test-subscribe
 *
 * This endpoint triggers a subscription and returns a confirmation.
 */
export async function testEventSubscription(req: Request, res: Response): Promise<void> {
  const deviceId = parseInt(req.params.id, 10);
  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'Invalid device ID' });
    return;
  }

  try {
    const device = await Devices.findByPk(deviceId);
    if (!device || !device.device) {
      res.status(404).json({ error: 'Device not found or device data is missing' });
      return;
    }

    // Parse connection details from the device buffer
    const [ipAddress] = device.device.toString('utf-8').split('|');
    const username = device.rtsp_username.toString('utf-8');
    const password = device.rtsp_password.toString('utf-8');

    // Start a subscription
    await subscribeToEvents(
      ipAddress,
      device.onvif_port,
      username,
      password,
      device.id
    );

    res.json({ message: 'Subscribed to events. Check logs for events.' });
  } catch (error) {
    Logger.error(`Failed to subscribe to events for device ${deviceId}:`, error);
    res.status(500).json({ error: 'Failed to subscribe to events' });
  }
}

/**
 * GET /devices/:id/events/live-topics
 *
 * Returns all topics that have been seen (if you want to poll them separately).
 */
export async function getLiveEventTypes(req: Request, res: Response): Promise<void> {
  const topics = Array.from(seenEventTopics).map(topic => ({
    type: extractTypeFromTopic(topic),
    label: getLabelFromTopic(topic)
  }));
  res.json(topics);
}

/**
 * GET /devices/:id/events/live-scan
 *
 * This endpoint subscribes to ONVIF events for 20 seconds and returns all unique event topics received.
 */
export async function liveEventScan(req: Request, res: Response): Promise<void> {
  const deviceId = parseInt(req.params.id, 10);
  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'Invalid device ID' });
    return;
  }

  try {
    // Retrieve the device record from the database.
    const device = await Devices.findByPk(deviceId);
    if (!device || !device.device) {
      res.status(404).json({ error: 'Device not found or device data is missing' });
      return;
    }

    // Parse connection details from the device buffer
    const [ipAddress] = device.device.toString('utf-8').split('|');
    const username = device.rtsp_username.toString('utf-8');
    const password = device.rtsp_password.toString('utf-8');
    const port = device.onvif_port;

    const Cam = require('onvif').Cam;
    const cam = new Cam({
      hostname: ipAddress,
      port,
      username,
      password,
      timeout: 10000
    });

    // Helper to extract type/label from topic string
    function extractTypeFromTopic(topic: string) {
      const parts = topic.split('/');
      return parts[parts.length - 1].toLowerCase();
    }
    function getLabelFromTopic(topic: string) {
      const type = extractTypeFromTopic(topic);
      if (type === 'motionalarm') return 'Motion Detection';
      if (type === 'vehicledetect') return 'Vehicle Detection';
      if (type === 'peopledetect' || type === 'persondetect') return 'Person Detection';
      if (type === 'facedetect') return 'Face Detection';
      if (type === 'dogcatdetect') return 'Dog / Cat detection';
      return type.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
    }

    const seenTopics = new Set<string>();
    const onEvent = (msg: any) => {
      if (msg.topic && msg.topic._) {
        seenTopics.add(msg.topic._);
      }
    };

    await new Promise<void>((resolve, reject) => {
      cam.connect((err: any) => {
        if (err) return reject(err);
        cam.on('event', onEvent);
        setTimeout(() => {
          cam.removeListener('event', onEvent);
          resolve();
        }, 20000);
      });
    });

    const topics = Array.from(seenTopics).map(topic => ({
      type: extractTypeFromTopic(topic),
      label: getLabelFromTopic(topic),
      fullTopic: topic
    }));

    res.json({ liveTopics: topics });
  } catch (error) {
    Logger.error('Failed to perform live event scan:', error && (error.stack || error.message || JSON.stringify(error)));
    res.status(500).json({ error: 'Failed to perform live event scan' });
  }
}

router.get('/devices/:id/events/types', getAvailableEventTypes);
router.get('/devices/:id/events/test-subscribe', testEventSubscription);
router.get('/devices/:id/events/live-topics', getLiveEventTypes);
router.get('/devices/:id/events/live-scan', liveEventScan);

export default router;
