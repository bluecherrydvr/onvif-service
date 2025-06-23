// In src/docs/Events.ts
const eventSubscription = {
    tags: ['Events'],
    summary: 'Subscribe to device events',
    operationId: 'subscribeToEvents',
    parameters: [
        {
            name: 'deviceId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
        },
        {
            name: 'eventTypes',
            in: 'body',
            required: true,
            schema: {
                type: 'array',
                items: { type: 'string' }
            }
        }
    ],
    responses: {
        '200': {
            description: 'Successfully subscribed to events',
            content: {
                'application/json': {
                    schema: {
                        type: 'object',
                        properties: {
                            success: { type: 'boolean' },
                            message: { type: 'string' }
                        }
                    }
                }
            }
        }
    }
};

