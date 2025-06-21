# ONVIF Service

This service provides ONVIF event handling capabilities for Bluecherry DVR.

## Overview

The ONVIF Service connects to IP cameras using the ONVIF protocol and subscribes to events. It processes these events and makes them available to the Bluecherry DVR system.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Build the service:
   ```
   npm run build
   ```

3. Start the service:
   ```
   npm start
   ```

## Configuration

The service runs on port 4000 by default. This can be changed in the `src/index.ts` file.

## TODO

- [ ] Contribute the callback context fix patch back to the `bluecherry-node-onvif` repository to avoid needing the patch in future deployments.
- [ ] Implement better error handling and reconnection logic for ONVIF devices.
- [ ] Add more comprehensive logging for debugging ONVIF connection issues.
- [ ] Create a proper API endpoint in Bluecherry API to receive device status updates. 