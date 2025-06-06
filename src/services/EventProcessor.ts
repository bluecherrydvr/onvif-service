import { Server } from '../server';  // Changed from '../../server' to '../server'
import { Events } from '../models/db/Events';

export class EventProcessor {
    static async processEvent(event: any): Promise<void> {
        try {
            // Validate event format
            this.validateEvent(event);

            // Process based on event type
            switch(event.type_id) {
                case 'motion':
                    await this.handleMotionEvent(event);
                    break;
                case 'tampering':
                    await this.handleTamperingEvent(event);
                    break;
                // Add more event types
            }

            // Store processed event
            await Events.create({
                ...event,
                time: Math.floor(Date.now() / 1000)
            });

        } catch (error) {
            Server.Logs.error(`Event processing failed: ${error}`);
            throw error;
        }
    }

    private static validateEvent(event: any): void {
        if (!event.type_id) {
            throw new Error('Event type is required');
        }
    }

    private static async handleMotionEvent(event: any): Promise<void> {
        // Add implementation using the event parameter
        Server.Logs.debug(`Processing motion event: ${JSON.stringify(event)}`);
        // Add your motion event handling logic here
    }

    private static async handleTamperingEvent(event: any): Promise<void> {
        // Add implementation using the event parameter
        Server.Logs.debug(`Processing tampering event: ${JSON.stringify(event)}`);
        // Add your tampering event handling logic here
    }
}

