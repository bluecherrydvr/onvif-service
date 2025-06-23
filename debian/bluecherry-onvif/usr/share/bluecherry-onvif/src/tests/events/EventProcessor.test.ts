import { EventProcessor } from '../../services/EventProcessor';  // Update to the correct version
import { Events } from '../../models/db/Events';  // Correct path
import { OnvifEventInterface } from '../../interfaces/OnvifEventInterface';  // Assuming the file exists
import { DeviceInfoService } from '../../services/onvif/DeviceInfoService';
import { CameraEventService } from '../../services/onvif/CameraEventService';
import { Cam } from 'onvif';

jest.mock('../../models/db/Events', () => ({
    Events: {
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock('../../services/DeviceInfoService', () => ({
    DeviceInfoService: {
        getDeviceConnectionInfo: jest.fn(),
        validateConnectionInfo: jest.fn(),
    },
}));

jest.mock('../../services/onvif/CameraEventService', () => ({
    CameraEventService: {
        getEventTypes: jest.fn(),
        connectToCamera: jest.fn(),
        getSupportedEvents: jest.fn(),
    },
}));

describe('EventProcessor', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should process motion events correctly', async () => {
        const mockEvent = {
            device_id: 1,
            type_id: 'motion',
            details: 'Motion detected in zone 1',
        };

        // Mocking Events.findOne to return mockEvent
        (Events.findOne as jest.Mock).mockResolvedValue(mockEvent);

        // Call the method that processes the event
        const result = await EventProcessor.processEvent(mockEvent);

        // Ensure the correct parameters were used in the call
        expect(Events.findOne).toHaveBeenCalledWith({
            where: expect.objectContaining({
                device_id: 1,
                type_id: 'motion',
            }),
        });

        // Ensure the result matches the mock data
        expect(result).toEqual(mockEvent);
    });
});

describe('CameraEventService', () => {
    it('should mock getEventTypes', async () => {
        const deviceId = 1;
        const mockEvents = ['Motion', 'Tamper'];

        (CameraEventService.getEventTypes as jest.Mock).mockResolvedValue(mockEvents);

        const result = await CameraEventService.getEventTypes(String(deviceId));

        expect(result).toEqual(mockEvents);
        expect(CameraEventService.getEventTypes).toHaveBeenCalledWith(String(deviceId));
    });

    it('should mock connectToCamera', async () => {
        const mockCamera = {} as Cam;

        (CameraEventService.connectToCamera as jest.Mock).mockResolvedValue(mockCamera);

        const cameraConfig = {
            hostname: '192.168.1.1',
            username: 'admin',
            password: 'password',
            port: 8080,
        };

        const camera = await CameraEventService.connectToCamera(cameraConfig);

        expect(camera).toEqual(mockCamera);
        expect(CameraEventService.connectToCamera).toHaveBeenCalledWith(cameraConfig);
    });

    it('should mock getSupportedEvents', async () => {
        const mockEvents = ['Motion', 'Tamper'];
        const mockCamera = {} as Cam;

        (CameraEventService.getSupportedEvents as jest.Mock).mockResolvedValue(mockEvents);

        const events = await CameraEventService.getSupportedEvents(mockCamera);

        expect(events).toEqual(mockEvents);
        expect(CameraEventService.getSupportedEvents).toHaveBeenCalledWith(mockCamera);
    });
});

describe('DeviceInfoService', () => {
    it('should mock getDeviceConnectionInfo', async () => {
        const deviceId = 1;
        const mockDeviceInfo = {
            ipAddress: '192.168.1.100',
            rtspUsername: 'admin',
            rtspPassword: 'password',
            onvifPort: 80,
        };

        (DeviceInfoService.getDeviceConnectionInfo as jest.Mock).mockResolvedValue(mockDeviceInfo);

        const result = await DeviceInfoService.getDeviceConnectionInfo(deviceId);

        expect(result).toEqual(mockDeviceInfo);
        expect(DeviceInfoService.getDeviceConnectionInfo).toHaveBeenCalledWith(deviceId);
    });

    it('should mock validateConnectionInfo', () => {
        const validInfo = {
            ipAddress: '192.168.1.100',
            rtspUsername: 'admin',
            rtspPassword: 'password',
            onvifPort: 80,
        };

        (DeviceInfoService.validateConnectionInfo as jest.Mock).mockReturnValue(true);

        const result = DeviceInfoService.validateConnectionInfo(validInfo);
        expect(result).toBe(true);
        expect(DeviceInfoService.validateConnectionInfo).toHaveBeenCalledWith(validInfo);
    });
});

