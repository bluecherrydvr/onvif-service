import { Express } from 'express';
import { TriggerController } from '../controllers/TriggerController';
import { CameraEventTypes } from '../controllers/CameraEventTypes';


export class Routes {
    static Register(app: Express): void {
        // Trigger endpoint
        app.get('/trigger', TriggerController.trigger);
        app.get('/devices/:deviceId/event-types', CameraEventTypes.getEventTypes);
    }
}

