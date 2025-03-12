import { Request, Response } from 'express';
import { Server } from '../server';
import { OnvifEventHandler } from '../services/OnvifEventHandler';

export class TriggerController {
    static async trigger(req: Request, res: Response): Promise<void> {
        try {
            const cameraId = parseInt(req.query.camera_id as string);
            const description = req.query.description as string;

            if (!cameraId || isNaN(cameraId)) {
                res.status(400).send('Bad Request - numeric parameter camera_id is required');
                return;
            }

            await OnvifEventHandler.triggerRecording(cameraId, description || 'Manual Trigger');
            res.status(200).send('OK');
        } catch (error) {
            Server.Logs.error(`Trigger error: ${error}`);
            res.status(500).send(`Server Error - ${error.message}`);
        }
    }
}

