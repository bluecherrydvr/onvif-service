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
}

