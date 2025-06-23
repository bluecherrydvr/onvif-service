import { Request, Response } from 'express';
import { EventHandlerService } from '../../../services/onvif/EventHandlerService';

export const updateDeviceHandler = async (req: Request, res: Response) => {
    const deviceId = parseInt(req.params.deviceId);
    const data = req.body;

    try {
        if (data.onvif_events_enabled !== undefined) {
            const eventHandler = new EventHandlerService();

            if (data.onvif_events_enabled) {
                await eventHandler.subscribeToDeviceEvents(deviceId);
            } else {
                await eventHandler.unsubscribeFromDeviceEvents(deviceId);
            }
        }

        res.status(200).json({ message: 'Device updated successfully' });
    } catch (error) {
        console.error('Update device error:', error);
        res.status(500).json({ error: 'Failed to update device' });
    }
};
