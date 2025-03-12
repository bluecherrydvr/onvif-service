import { Router } from 'express';
import { EventController } from './EventController';

const router = Router();

router.post('/devices/:deviceId/events/subscribe', async (req, res) => {
    try {
        await EventController.subscribeToDeviceEvents(parseInt(req.params.deviceId));
        res.status(200).json({ message: 'Successfully subscribed to events' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/devices/:deviceId/events/unsubscribe', async (req, res) => {
    try {
        await EventController.unsubscribeFromDeviceEvents(parseInt(req.params.deviceId));
        res.status(200).json({ message: 'Successfully unsubscribed from events' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;

