// src/routes/Events/EventTypes.ts

import { Request, Response } from 'express';
import { Devices } from '../../models/db/Device';
import { Server } from '../../server';
import { Cam, EventProperties } from 'onvif';
import { Logger } from '../../utils/Logger';
import { SUPPORTED_EVENT_TYPES } from '../../services/OnvifDeviceWrapper';

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

export async function getAvailableEventTypes(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { ip, port, username, password } = req.query;

  if (!ip || !port || !username || !password) {
    res.status(400).json({ error: 'Missing required parameters' });
    return;
  }

  const cam = new Cam({
    hostname: ip as string,
    port: parseInt(port as string, 10),
    username: username as string,
    password: password as string,
    timeout: 10000
  });

  try {
    await new Promise<void>((resolve, reject) => {
      cam.connect((err) => {
        if (err) {
          Logger.error(`Failed to connect to camera ${id}: ${err.message}`);
          reject(err);
        } else {
          resolve();
        }
      });
    });

    // Get available event types
    const eventTypes = await new Promise<string[]>((resolve, reject) => {
      cam.getEventProperties((error, result) => {
        if (error) {
          Logger.error(`Failed to get event properties for camera ${id}: ${error.message}`);
          reject(error);
          return;
        }

        try {
          const topics = extractTopics(result);
          resolve(topics);
        } catch (parseError) {
          Logger.error(`Failed to parse event properties for camera ${id}: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
          reject(parseError);
        }
      });
    });

    res.json({ eventTypes });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: errorMessage });
  }
}

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

