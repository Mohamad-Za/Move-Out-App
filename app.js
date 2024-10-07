const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const indexRoutes = require('./routes/indexRoutes');
const passport = require('./src/cli').passport; // Import the passport instance
const session = require('express-session');
const cron = require('node-cron');
const { deactivateInactiveUsers, sendReminderEmails } = require('./src/cli'); // Import the functions from cli.js

const app = express();
const PORT = 3000;

// Set view engine to EJS
app.set('view engine', 'ejs');

// Middleware for parsing form data
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize session middleware for passport.js
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());
  
// app.use((req, res, next) => {
//     console.log('Session data:', req.session); // Log session data on every request
//     next();
// });


// Use the routes
app.use('/move_out', indexRoutes);

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Cron jobs
cron.schedule('0 0 * * *', async () => {
  console.log('Running inactivity check...');
  await deactivateInactiveUsers();
});

cron.schedule('0 0 * * *', async () => {
  console.log('Sending reminder emails...');
  await sendReminderEmails();
});
