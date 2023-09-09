const express = require('express');
const bodyParser = require('body-parser');
const onvifSubscriptionRoutes = require('./routes/onvifSubscriptionRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const ptzRoutes = require('./routes/ptzRoutes');


const app = express();
app.use(bodyParser.json());

// Use ONVIF subscription routes
app.use('/api', deviceRoutes);
app.use('/api', onvifSubscriptionRoutes);
app.use('/api', ptzRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});