import { Router, Request, Response } from 'express';
import { EventController } from './EventController';
import { CameraEventService } from '../../../services/onvif/CameraEventService';

const router = Router();

router.get('/devices/:deviceId/events/types', async (req, res) => {
    try {
        const deviceId = parseInt(req.params.deviceId);
        const eventTypes = await CameraEventService.getEventTypes(deviceId);
        res.status(200).json(eventTypes);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/devices/:deviceId/events/subscribe', async (req: Request, res: Response) => {
    try {
        await EventController.subscribeToDeviceEvents(parseInt(req.params.deviceId));
        res.status(200).json({ message: 'Successfully subscribed to events' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/devices/:deviceId/events/unsubscribe', async (req: Request, res: Response) => {
    try {
        await EventController.unsubscribeFromDeviceEvents(parseInt(req.params.deviceId));
        res.status(200).json({ message: 'Successfully unsubscribed from events' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

