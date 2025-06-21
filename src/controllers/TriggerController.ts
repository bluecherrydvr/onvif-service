import { Request, Response } from 'express';
import { EventHandlerService } from '../services/onvif/EventHandlerService';

const eventHandler = new EventHandlerService();

/**
 * Endpoint to manually trigger an ONVIF event recording for testing purposes.
 * This simulates an event as if it were received from the camera.
 */
export async function triggerEventRecording(req: Request, res: Response): Promise<void> {
    const deviceId = parseInt(req.params.deviceId, 10);

    const mockEvent = {
        type: req.body.type || 'manual',
        description: req.body.description || 'Manually triggered event',
        timestamp: new Date().toISOString(),
    };

    try {
        await eventHandler.handleDeviceEvent(deviceId, mockEvent);
        res.status(200).json({ message: 'Event successfully recorded.' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
}


