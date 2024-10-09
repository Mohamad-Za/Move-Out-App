const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const indexRoutes = require('./routes/indexRoutes');
const passport = require('./src/cli').passport; 
const session = require('express-session');
const cron = require('node-cron');
const { deactivateInactiveUsers, sendReminderEmails } = require('./src/cli'); 

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());
  
// app.use((req, res, next) => {
//     console.log('Session data:', req.session); // Log session data on every request
//     next();
// });


app.use('/move_out', indexRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

cron.schedule('0 0 * * *', async () => {
  console.log('Running inactivity check...');
  await deactivateInactiveUsers();
});

cron.schedule('0 0 * * *', async () => {
  console.log('Sending reminder emails...');
  await sendReminderEmails();
});
