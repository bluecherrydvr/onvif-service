import { Events } from '../../models/db/Events';

export class EventProcessor {
    static async processEvent(event: { device_id: number; type_id: string; details: string }): Promise<void> {
        try {
            // Validate event format
            this.validateEvent(event);

            // Process event (add time)
            const eventData = {
                ...event,
                time: Math.floor(Date.now() / 1000),  // Add current Unix timestamp
            };

            // Create the event with time
            await Events.create(eventData);

        } catch (error) {
            console.error('Event processing failed:', error);
            throw error;
        }
    }

    private static validateEvent(event: any): void {
        if (!event.type_id || !event.device_id) {
            throw new Error('Event type and device_id are required');
        }
    }
}
