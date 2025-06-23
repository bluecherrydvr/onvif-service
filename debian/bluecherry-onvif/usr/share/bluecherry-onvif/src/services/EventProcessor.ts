// src/services/EventProcessor.ts
import { Server } from '../server'; // Assuming you have a server object for logging
import { Events } from '../models/db/Events';

export class EventProcessor {
    // Static method to process events
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
                // Add more event types here as needed
                default:
                    console.log(`Unknown event type: ${event.type_id}`);
                    break;
            }

            // Store processed event with timestamp
            await Events.create({
                ...event,
                time: Math.floor(Date.now() / 1000), // Store current time as a Unix timestamp
            });

        } catch (error) {
            Server.Logs.error(`Event processing failed: ${error}`);
            throw error;
        }
    }

    // Event validation
    private static validateEvent(event: any): void {
        if (!event.type_id) {
            throw new Error('Event type is required');
        }
    }

    // Handling 'motion' type events
    private static async handleMotionEvent(event: any): Promise<void> {
        Server.Logs.debug(`Processing motion event: ${JSON.stringify(event)}`);
        // Add motion-specific logic here
    }

    // Handling 'tampering' type events
    private static async handleTamperingEvent(event: any): Promise<void> {
        Server.Logs.debug(`Processing tampering event: ${JSON.stringify(event)}`);
        // Add tampering-specific logic here
    }
}
