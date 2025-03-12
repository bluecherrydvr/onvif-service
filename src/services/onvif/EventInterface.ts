import { DeviceInfoService } from './DeviceInfoService';

export class OnvifEventInterface {
    private pythonProcess: any;
    
    constructor(private deviceId: number) {}

    async initialize(): Promise<void> {
        try {
            // Get device connection info
            const deviceInfo = await DeviceInfoService.getDeviceConnectionInfo(this.deviceId);
            
            // Validate connection info
            if (!DeviceInfoService.validateConnectionInfo(deviceInfo)) {
                throw new Error(`Invalid device connection info for device ${this.deviceId}`);
            }

            // Use the connection info to start the Python ONVIF service
            this.pythonProcess = spawn('python3', [
                'src/services/onvif/event_service.py',
                'subscribe',
                JSON.stringify({
                    host: deviceInfo.ipAddress,
                    port: deviceInfo.onvifPort,
                    username: deviceInfo.rtspUsername,
                    password: deviceInfo.rtspPassword
                })
            ]);

            // Set up event handlers
            this.setupEventHandlers();

        } catch (error) {
            Server.Logs.error(`Failed to initialize ONVIF interface: ${error}`);
            throw error;
        }
    }

    private setupEventHandlers(): void {
        this.pythonProcess.stdout.on('data', (data) => {
            try {
                const event = JSON.parse(data);
                Server.Logs.debug(`Received ONVIF event: ${JSON.stringify(event)}`);
                // Handle event processing
            } catch (e) {
                Server.Logs.error(`Failed to parse event data: ${e}`);
            }
        });

        this.pythonProcess.stderr.on('data', (data) => {
            Server.Logs.error(`Python ONVIF error: ${data}`);
        });
    }

    stop(): void {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
        }
    }
}

private handlePythonError(error: any): void {
    Server.Logs.error(`Python ONVIF process error: ${error}`);
    // Attempt to reconnect or notify system of failure
    this.attemptReconnection();
}

private async attemptReconnection(): Promise<void> {
    try {
        await this.stop();
        await this.initialize();
    } catch (error) {
        Server.Logs.error(`Failed to reconnect to device: ${error}`);
        // Notify system of permanent failure
    }
}

