import { Server } from '../server';
import { Devices } from '../models/db/Device';
import { EventProcessor } from './EventProcessor';

export class OnvifEventHandler {
    static async triggerRecording(cameraId: number, description: string): Promise<void> {
        try {
            const device = await Devices.findOne({ where: { id: cameraId } });
            
            if (!device) {
                throw new Error(`Device not found with ID: ${cameraId}`);
            }

            const event = {
                device_id: cameraId,
                type_id: 'motion', // or another appropriate event type
                description: description,
                // Add any other required event properties
            };

            await EventProcessor.processEvent(event);
        } catch (error) {
            Server.Logs.error(`Error triggering recording: ${error}`);
            throw error;
        }
    }
}

