from onvif import ONVIFCamera
import zeep
import json
from typing import Dict, List

class OnvifEventService:
    def __init__(self, host: str, port: int, user: str, pwd: str):
        self.camera = ONVIFCamera(host, port, user, pwd)
        self.events = self.camera.create_events_service()
        
    def get_event_properties(self) -> Dict:
        """Get supported event properties from camera"""
        try:
            properties = self.events.GetEventProperties()
            # Convert zeep objects to JSON serializable format
            return zeep.helpers.serialize_object(properties)
        except Exception as e:
            raise Exception(f"Failed to get event properties: {str(e)}")
            
    def create_pull_point(self):
        """Create event pull point subscription"""
        try:
            pull_point = self.events.CreatePullPointSubscription()
            return pull_point
        except Exception as e:
            raise Exception(f"Failed to create pull point: {str(e)}")
            
    def pull_messages(self, pull_point, timeout: str = 'PT5S'):
        """Pull messages from subscription"""
        try:
            return pull_point.PullMessages({
                'Timeout': timeout,
                'MessageLimit': 100
            })
        except Exception as e:
            raise Exception(f"Failed to pull messages: {str(e)}")

