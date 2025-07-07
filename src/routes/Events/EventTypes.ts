// src/routes/Events/EventTypes.ts

import { Request, Response } from 'express';
import { Devices } from '../../models/db/Device';
import { Server } from '../../server';
import { Cam, EventProperties } from 'onvif';
import { Logger } from '../../utils/Logger';
import { SUPPORTED_EVENT_TYPES } from '../../services/OnvifDeviceWrapper';
import express from 'express';

const router = express.Router();

const EVENT_LABELS: Record<string, string> = {
  FaceDetect: 'Face Detection',
  PeopleDetect: 'Human Detection',
  VehicleDetect: 'Vehicle Detection',
  DogCatDetect: 'Animal Detection',
  MotionAlarm: 'Motion Detection',
  Motion: 'Motion Detection',
  LineCrossing: 'Line Crossing',
  TamperDetect: 'Tampering',
  AudioAlarm: 'Audio Detection',
};

// Recursive helper to scan topic tree
function scanTopics(
  node: any,
  path: string,
  matches: { type: string; label: string }[]
): void {
  for (const key of Object.keys(node)) {
    if (key === '$') continue;
    const child = node[key];

    // Build topic path
    const newPath = path ? `${path}/${key}` : key;

    // If child has a messageDescription and is a topic
    if (child.messageDescription && child.$?.['wstop:topic']) {
      const label = getLabelFromTopic(newPath);
      matches.push({
        type: key.toLowerCase(),
        label
      });
    }

    // Continue scanning deeper
    scanTopics(child, newPath, matches);
  }
}

function getLabelFromTopic(topic: string): string {
  const lower = topic.toLowerCase();

  if (lower.includes('myruledetector/facedetect')) return 'Face Detection';
  if (lower.includes('myruledetector/peopledetect')) return 'People Detection';
  if (lower.includes('myruledetector/vehicledetect')) return 'Vehicle Detection';
  if (lower.includes('myruledetector/dogcatdetect')) return 'Dog/Cat Detection';
  if (lower.includes('cellmotiondetector/motion')) return 'Motion Detection';
  if (lower.includes('videosource/motionalarm')) return 'Motion Alarm';

  return 'Motion Detection'; // fallback
}

function extractTypeFromTopic(topic: string): string {
  const parts = topic.split('/');
  return parts[parts.length - 1]?.toLowerCase() || 'unknown';
}

function extractTopics(result: EventProperties): string[] {
  const topics: string[] = [];

  function scanTopics(obj: any, prefix: string = '') {
    if (!obj || typeof obj !== 'object') return;

    if (obj['tns1:Topic']) {
      scanTopics(obj['tns1:Topic'], prefix);
      return;
    }

    for (const key in obj) {
      const fullTopic = prefix ? `${prefix}/${key}` : key;
      if (SUPPORTED_EVENT_TYPES.includes(fullTopic)) {
        topics.push(fullTopic);
      }
      scanTopics(obj[key], fullTopic);
    }
  }

  if (result.topicSet) {
    scanTopics(result.topicSet);
  }

  return topics;
}

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

// GET /devices/:id/events/types?ip=...&port=...&username=...&password=...
router.get('/devices/:id/events/types', async (req, res) => {
  const { ip, port, username, password } = req.query;
  const camPort = port ? parseInt(port as string, 10) : 80;
  try {
    Logger.debug(`Connecting to ONVIF camera at: http://${username}:${password}@${ip}:${camPort}`);
    const cam = new Cam({
      hostname: ip as string,
      port: camPort,
      username: username as string,
      password: password as string,
      timeout: 10000,
      preserveAddress: true
    }, (err: any) => {
      if (err) {
        Logger.error('ONVIF connection error:', err);
        return res.status(500).json({ error: 'Failed to connect to camera', details: err.message || err });
      }
      cam.getEventProperties((err: any, result: any) => {
        if (err || !result || !result.topicSet) {
          Logger.error('Failed to get ONVIF event properties:', err);
          return res.status(500).json({ error: 'Failed to get ONVIF event properties', details: err && err.message });
        }
        const supportedEvents = flattenTopics(result.topicSet);
        Logger.debug(`Supported ONVIF event types: ${JSON.stringify(supportedEvents)}`);
        return res.json({ supportedEvents });
      });
    });
  } catch (e: any) {
    Logger.error('Unexpected error in event type capability endpoint:', e);
    return res.status(500).json({ error: 'Unexpected error', details: e.message });
  }
});

export default router;

// Bonus: Test live event subscription
export async function testSubscribeToEvents(req: Request, res: Response): Promise<void> {
  const deviceId = parseInt(req.params.deviceId);
  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'Invalid device ID' });
    return;
  }

  const device = await Devices.findOne({ where: { id: deviceId } });
  if (!device) {
    res.status(404).json({ error: 'Device not found' });
    return;
  }

  const fullUrl = `http://${device.rtsp_username}:${device.rtsp_password}@${device.ip_address}:${device.onvif_port}`;
  Server.Logs.debug(`Connecting for test subscription at: ${fullUrl}`);

  new Cam({
    hostname: device.ip_address,
    port: device.onvif_port,
    username: device.rtsp_username,
    password: device.rtsp_password,
    timeout: 10000
  }, function (err: Error | null) {
    if (err) {
      Server.Logs.error(`ONVIF connection failed for test subscription: ${err}`);
      res.status(500).json({ error: 'Failed to connect to device' });
      return;
    }

    this.on('event', (msg: any) => {
      if (msg.topic && msg.topic._) {
        const topic = msg.topic._;
        Server.Logs.debug(`Received live event: ${topic}`);
      } else {
        Server.Logs.debug('Received event with no topic.');
      }
    });

    res.json({ message: 'Subscribed for 20 seconds. Check logs for events.' });

    // Stop after 20 seconds
    setTimeout(() => {
      Server.Logs.debug(`Test subscription finished for device ${deviceId}`);
    }, 20000);
  });
}

