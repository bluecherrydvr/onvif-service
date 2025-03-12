describe('EventProcessor', () => {
    beforeEach(() => {
        // Setup test database
    });

    it('should process motion events correctly', async () => {
        const mockEvent = {
            device_id: 1,
            type_id: 'motion',
            details: 'Motion detected in zone 1'
        };

        await EventProcessor.processEvent(mockEvent);
        
        const storedEvent = await Events.findOne({
            where: { 
                device_id: mockEvent.device_id,
                type_id: mockEvent.type_id
            }
        });

        expect(storedEvent).toBeDefined();
        expect(storedEvent.details).toBe(mockEvent.details);
    });
});

