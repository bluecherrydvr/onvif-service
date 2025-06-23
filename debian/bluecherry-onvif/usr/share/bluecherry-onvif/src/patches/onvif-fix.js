/**
 * Fix for the ONVIF library's callback context issue
 * This file should be required before using the ONVIF library
 */

// Import the ONVIF library
const onvif = require('onvif');

// Store the original functions
const originalPullMessages = onvif.Cam.prototype.pullMessages;
const originalCreatePullPointSubscription = onvif.Cam.prototype.createPullPointSubscription;
const originalUnsubscribe = onvif.Cam.prototype.unsubscribe;

// Fix the pullMessages function
onvif.Cam.prototype.pullMessages = function(options, callback) {
  // If no callback is provided, just call the original function
  if (!callback) {
    return originalPullMessages.call(this, options);
  }
  
  // Create a wrapper callback that ensures 'this' is set correctly
  const wrapperCallback = (err, data, xml) => {
    if (callback) {
      callback.call(this, err, data, xml);
    }
  };
  
  // Call the original function with our wrapper callback
  return originalPullMessages.call(this, options, wrapperCallback);
};

// Fix the createPullPointSubscription function
onvif.Cam.prototype.createPullPointSubscription = function(callback) {
  // If no callback is provided, just call the original function
  if (!callback) {
    return originalCreatePullPointSubscription.call(this);
  }
  
  // Create a wrapper callback that ensures 'this' is set correctly
  const wrapperCallback = (err, subscription, xml) => {
    if (callback) {
      callback.call(this, err, subscription, xml);
    }
  };
  
  // Call the original function with our wrapper callback
  return originalCreatePullPointSubscription.call(this, wrapperCallback);
};

// Fix the unsubscribe function
onvif.Cam.prototype.unsubscribe = function(callback) {
  // If no callback is provided, just call the original function
  if (!callback) {
    return originalUnsubscribe.call(this);
  }
  
  // Create a wrapper callback that ensures 'this' is set correctly
  const wrapperCallback = (err, data, xml) => {
    if (callback) {
      callback.call(this, err, data, xml);
    }
  };
  
  // Call the original function with our wrapper callback
  return originalUnsubscribe.call(this, wrapperCallback);
};

// Export the patched module
module.exports = onvif; 