import { Request, Response, Router } from 'express';
import { Devices } from '../../../models/db/Device';
import { subscribeToEvents } from '../../../services/OnvifEventHandler';
import { seenEventTopics, extractTypeFromTopic, getLabelFromTopic } from '../../../utils/TopicUtils';
import { Logger } from '../../../utils/Logger';

const router = Router();

/**
 * GET /devices/:id/events/types
 *
 * This endpoint clears any previously seen live event topics, triggers a subscription
 * to ONVIF events for the specified device, waits 20 seconds, and then returns the unique event topics
 * detected during that period.
 */
export async function getAvailableEventTypes(req: Request, res: Response): Promise<void> {
  const deviceId = parseInt(req.params.id, 10);
  if (isNaN(deviceId)) {
    res.status(400).json({ error: 'Invalid device ID' });
    return;
  }

  try {
    // Clear any previously seen topics.
    seenEventTopics.clear();

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
    
    // Log connection details (for debugging)
    const fullUrl = `http://${username}:${password}@${ipAddress}:${device.onvif_port}`;
    Logger.debug(`Connecting to ONVIF camera at: ${fullUrl}`);

    // Start a subscription to capture event topics.
    const subscriptionPromise = subscribeToEvents(
      ipAddress,
      device.onvif_port,
      username,
      password,
      device.id
    );

    // Wait for 20 seconds to allow events to be captured.
    await new Promise(resolve => setTimeout(resolve, 20000));

    // Map the live topics to structured items.
    const topics = Array.from(seenEventTopics).map(topic => ({
      type: extractTypeFromTopic(topic),
      label: getLabelFromTopic(topic)
    }));

    // Deduplicate topics by type.
    const uniqueTopics = Array.from(
      new Map(topics.map(item => [item.type, item])).values()
    );

    res.json(uniqueTopics);
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

router.get('/devices/:id/events/types', getAvailableEventTypes);
router.get('/devices/:id/events/test-subscribe', testEventSubscription);
router.get('/devices/:id/events/live-topics', getLiveEventTypes);

export default router;
