export class EventError extends ErrorResponse {
    constructor(statusCode: number, message: string, details?: any) {
        super(statusCode, message);
        this.details = details;
    }

    static deviceNotFound(deviceId: number): EventError {
        return new EventError(404, `Device ${deviceId} not found`);
    }

    static subscriptionFailed(reason: string): EventError {
        return new EventError(500, `Event subscription failed: ${reason}`);
    }
}

