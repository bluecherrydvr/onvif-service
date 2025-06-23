import { CameraEventService } from '../../services/onvif/CameraEventService';

// Mock data for testing
const mockCamera = { id: 'camera1', name: 'Mock Camera' };
const mockCameraConfig = {  // Use a config object as expected by connectToCamera
    hostname: '192.168.1.1',
    username: 'admin',
    password: 'password',
    port: 8080
};

describe('CameraEventService Tests', () => {
    // Test for mocking the 'connectToCamera' method
    it('should mock connectToCamera method', async () => {
        // Mock the private method using jest.spyOn()
        const connectToCameraMock = jest.spyOn(CameraEventService, 'connectToCamera')
            .mockResolvedValue(mockCamera); // Mock the resolved value

        // Now calling the method will use the mocked behavior
        const camera = await CameraEventService.connectToCamera(mockCameraConfig);  // Use the correct config object

        // Assert that the mock was called with the correct parameters
        expect(connectToCameraMock).toHaveBeenCalledWith(mockCameraConfig);  // Expecting the correct object
        expect(camera).toEqual(mockCamera);  // Assert the returned value

        // Clean up the mock after the test
        connectToCameraMock.mockRestore();
    });

    // Test for mocking the 'getSupportedEvents' method
    it('should mock getSupportedEvents method', async () => {
        // Mock the 'getSupportedEvents' method
        const getSupportedEventsMock = jest.spyOn(CameraEventService, 'getSupportedEvents')
            .mockResolvedValue(['Motion', 'FaceDetect']); // Mock the events

        // Call the method and assert the returned events
        const events = await CameraEventService.getSupportedEvents(mockCamera);

        // Assert the mock was called and check the returned value
        expect(getSupportedEventsMock).toHaveBeenCalledWith(mockCamera);
        expect(events).toEqual(['Motion', 'FaceDetect']);  // Assert the event types

        // Clean up the mock after the test
        getSupportedEventsMock.mockRestore();
    });
});
