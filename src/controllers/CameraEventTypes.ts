import { Request, Response } from 'express';
import { OnvifEventInterface } from '../services/onvif/EventInterface';
import { Server } from '../server';

export class CameraEventTypes {
    private static eventInterfaces: Map<number, OnvifEventInterface> = new Map();

    static async getEventTypes(req: Request, res: Response): Promise<void> {
        try {
            const deviceId = parseInt(req.params.deviceId);
            
            if (isNaN(deviceId)) {
                res.status(400).json({ error: 'Invalid device ID' });
                return;
            }

            let eventInterface = CameraEventTypes.eventInterfaces.get(deviceId);

            if (!eventInterface) {
                eventInterface = new OnvifEventInterface(deviceId);
                CameraEventTypes.eventInterfaces.set(deviceId, eventInterface);
                
                try {
                     await eventInterface.initialize();
                } catch (error) {
                    CameraEventTypes.eventInterfaces.delete(deviceId);
                    throw error;
                }
            }

            // Return success response
            res.status(200).json({
                message: 'Successfully retrieved event types',
                deviceId: deviceId
            });

        } catch (error) {
            Server.Logs.error(`Error getting event types: ${error}`);
            res.status(500).json({ error: 'Failed to get event types' });
        }
    }
}

