const axios = require('axios');

// Fake parameters
const fakeXaddr = 'http://fake-camera-ip/onvif/device_service';
const fakeUser = 'fake-username';
const fakePass = 'fake-password';

// Imitate the subscription process
async function imitateSubscription() {
    try {
        // Step 1: Initialize ONVIF device (Fake)
        console.log(`Initializing ONVIF device at ${fakeXaddr}...`);

        // Step 2: Create Subscription (Fake)
        console.log(`Creating subscription for user ${fakeUser}...`);
        const response = await axios.post(fakeXaddr, {
            // Normally, you'd send SOAP XML data here to create a subscription
            // For this example, we're just sending a fake payload
            fakePayload: 'createPullPointSubscription'
        }, {
            auth: {
                username: fakeUser,
                password: fakePass
            }
        });

        // Assume the response contains a fake subscription reference
        const fakeSubscription = response.data.fakeSubscriptionReference;
        console.log(`Subscription created with reference: ${fakeSubscription}`);

        // Step 3: Pull Messages (Fake)
        console.log(`Pulling messages for subscription ${fakeSubscription}...`);
        setInterval(async () => {
            // Normally, you'd send SOAP XML data here to pull messages
            // For this example, we're just sending a fake payload
            const pullResponse = await axios.post(fakeXaddr, {
                fakePayload: 'pullMessages'
            }, {
                auth: {
                    username: fakeUser,
                    password: fakePass
                }
            });

            // Assume the response contains fake events
            const fakeEvents = pullResponse.data.fakeEvents;
            console.log(`Received events: ${JSON.stringify(fakeEvents)}`);
        }, 10000); // Pull every 10 seconds

    } catch (error) {
        console.log(`Error during fake subscription process: ${error}`);
    }
}

// Run the imitation
imitateSubscription();
