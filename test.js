const bcrypt = require('bcryptjs');

async function generateHashedPassword() {
    const password = 'Admin123'; // Change this to your desired password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(hashedPassword); // Use this hashed password in the SQL statement
}

// Call the function to generate the hashed password
generateHashedPassword().catch(err => console.error(err));





// const express = require("express");
// const router = express.Router();
// const { getConnection, createUser, sendVerificationEmail, authenticateUser, verifyUserCode,
//     createBox, sendDeletionEmail, sendShareNotificationEmail, sendPinEmail, getAllUsers, getPublicBoxesByUser ,
//     saveCustomLabel, getSharedLabelsByEmail, updateLastActivity, sendMarketingEmail, toggleUserStatus, getStorageUsage} = require("./../src/cli.js");
// const session = require('express-session');
// const crypto = require('crypto');

// const QRCode = require('qrcode');
// const fs = require('fs');
// const multer = require('multer');
// const path = require('path');

// const passport = require('passport');

// // "use strict";
// const config = require("../config/db/move_out.json");
// const mysql = require("promise-mysql");


// // Initialize session middleware
// router.use(session({
//     secret: 'your_secret_key',
//     resave: false,
//     saveUninitialized: true
// }));

// // Redirect to registration
// router.get('/', (req, res) => {
//     res.redirect('/move_out/register');
// });   

// // Route: Render the registration page
// router.get('/register', (req, res) => {
//     let data = {};
//     data.title = "Register";
//     res.render('move_out/pages/register.ejs', data);
// });




// // POST route for registration with resend verification option
// router.post('/register', async (req, res) => {
//     const { email, password, name } = req.body;

//     // Check for minimum password length and alphanumeric characters
//     const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/; // At least 6 characters with both letters and numbers
//     if (!passwordPattern.test(password)) {
//         return res.render('move_out/pages/register.ejs', {
//             title: 'Register',
//             errorMessage: 'Password must be at least 6 characters long and include both letters and numbers.'
//         });
//     }

//     try {
//         // Create user and generate verification code (store in unverified_users)
//         const { verificationCode } = await createUser(email, password, name);

//         // Send verification email
//         await sendVerificationEmail(email, verificationCode);

//         // Render a success page with a button to redirect to the verify route
//         let data = {
//             title: 'Registration Successful',
//             message: 'Registration successful! Please check your email for the verification code.',
//             email: email  // Pass the email so it can be used on the verify page if needed
//         };
//         res.render('move_out/pages/send_to_verify.ejs', data);
//     } catch (err) {
//         if (err.message.includes('already registered')) {
//             // Render the resend verification page
//             let data = {
//                 title: 'Resend Verification Code',
//                 email: email
//             };
//             res.render('move_out/pages/resend_verification.ejs', data);
//         } else if (err.message.includes('already exists')) {
//             // Render a page that shows "User already exists" with a button to login
//             let data = {
//                 title: 'User Already Exists',
//                 message: 'User already exists with this email.',
//                 email: email
//             };
//             res.render('move_out/pages/send_to_login.ejs', data);
//         } else {
//             console.error(err);
//             res.status(500).send('Error creating user');
//         }
//     }
// });






// // Route for Google authentication
// router.get('/auth/google', (req, res, next) => {
//     console.log('Google authentication initiated'); // Log this line
//     passport.authenticate('google', {
//         scope: ['profile', 'email'] // Request profile and email scope
//     })(req, res, next);
// });


// // Google OAuth Callback route
// router.get('/auth/google/callback', 
//     passport.authenticate('google', { 
//         failureRedirect: '/move_out/login?error=deactivated', // Redirect to login on failure
//         failureMessage: true // Ensure a failure message is set
//     }),
//     (req, res) => {
//         if (req.user) {
//             // Check if the account is deactivated
//             if (req.user.status === 'inactive') {
//                 req.logout((err) => {
//                     if (err) { return next(err); }
//                     return res.redirect('/move_out/login?error=deactivated');
//                 });
//             } else {
//                 // Successful authentication, redirect to dashboard
//                 req.session.user = req.user; // Ensure user is set in session
//                 res.redirect('/move_out/dashboard');
//             }
//         } else {
//             res.redirect('/move_out/login?error=deactivated');
//         }
//     }
// );









// // Route: Handle logout
// router.get('/logout', (req, res) => {
//     req.logout((err) => {
//         if (err) { return next(err); }
//         res.redirect('/move_out/login');
//     });
// });


// // Route: Render the verification page (to enter the code)
// router.get('/verify', (req, res) => {
//     let data = {};
//     data.title = "Verify Email";
//     res.render('move_out/pages/verify.ejs', data);
// });

// // POST route to verify the 8-digit code
// router.post('/verify', async (req, res) => {
//     const { verificationCode } = req.body;

//     try {
//         // Call the verifyUserCode function from cli.js
//         const result = await verifyUserCode(verificationCode);

//         if (!result.success) {
//             return res.status(400).send(result.message);
//         }

//         // Render a success message with a button to redirect to the login route
//         let data = {
//             title: 'Email Verified',
//             message: 'Email successfully verified! You can now log in.'
//         };
//         res.render('move_out/pages/send_to_login.ejs', data);
//     } catch (err) {
//         console.error('Error verifying email:', err);
//         res.status(500).send('Error verifying email');
//     }
// });






// // POST route to resend verification email
// router.post('/resend-verification', async (req, res) => {
//     const { email } = req.body;

//     try {
//         const db = await mysql.createConnection(config);
//         console.log('Checking unverified_users table for email:', email);

//         // Find the user in the unverified_users table
//         const sql = 'SELECT * FROM unverified_users WHERE email = ?';
//         const result = await db.query(sql, [email]);

//         if (result.length === 0) {
//             console.log('User not found in unverified_users or already verified.');
//             return res.status(400).send('User not found or already verified.');
//         }

//         const user = result[0];
//         console.log('User found:', user);

//         // Use the existing 8-digit verification code
//         const verificationCode = user.verification_code;

//         console.log('Using existing verification code:', verificationCode);

//         // Send the verification email with the existing code
//         await sendVerificationEmail(email, verificationCode);
//         console.log('Verification email sent successfully to:', email);

//         // Render a response after successful email send
//         let data = {
//             title: 'Verification Email Sent',
//             message: 'Verification email resent! Please check your email.'
//         };
//         res.render('move_out/pages/verification_sent.ejs', data);
//     } catch (err) {
//         console.error('Error resending verification email:', err);
//         res.status(500).send('Error resending verification email');
//     }
// });




// // Route: Render the login page
// router.get('/login', (req, res) => {
//     let data = {};
//     data.title = "Login";
//     res.render('move_out/pages/login.ejs', data);
// });

// // POST route for login
// router.post('/login', async (req, res) => {
//     const { email, password } = req.body;

//     try {
//         const result = await authenticateUser(email, password);

//         if (result.success) {
//             const db = await getConnection();
//             const sql = 'SELECT * FROM users WHERE user_id = ?';
//             const [user] = await db.query(sql, [result.user.user_id]);

//             // Update session data with full user details, including profile image
//             req.session.user = user;

//             // Redirect admin users to the admin dashboard
//             if (user.is_admin) {
//                 return res.redirect('/move_out/admin/dashboard');
//             }

//             // Check if there's a redirect URL (e.g., when scanning QR code)
//             const redirectUrl = req.query.redirect || '/move_out/dashboard';

//             // Redirect to the original page or dashboard if no redirect URL is provided
//             return res.redirect(redirectUrl);
//         }

//         // Handle different reasons for failure
//         let error = 'invalid';
//         if (result.reason === 'deactivated') {
//             error = 'deactivated';
//         }

//         // Redirect to login page with appropriate error
//         return res.redirect(`/move_out/login?error=${error}`);
//     } catch (error) {
//         console.error('Error during login:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });









// // Route: Render dashboard if logged in
// router.get('/dashboard', (req, res) => {
//     console.log('Session User:', req.session.user); // Log session user
//     if (req.session.user) {
//         let data = {
//             title: 'Dashboard',
//             user: req.session.user
//         };
//         res.render('move_out/pages/dashboard.ejs', data);
//     } else {
//         res.redirect('/move_out/login');
//     }
// });



// // Route: Handle logout
// router.get('/logout', (req, res) => {
//     req.session.destroy(); // Destroy the session
//     res.redirect('/move_out/login');
// });



// // Route to render the box creation form
// router.get('/create-box', (req, res) => {
//     let data = {};
//     data.title = "Create New Box";
//     res.render('move_out/pages/create_box.ejs', data);
// });



// // Set up storage for multer (file uploads) to save images, audio, profile pictures, and other files
// const storage = multer.diskStorage({
//     destination: (req, file, cb) => {
//         if (file.fieldname === 'profileImage') {
//             cb(null, 'public/profiles'); // Store profile images in 'profiles' folder
//         } else if (file.fieldname === 'custom_label') {
//             cb(null, 'public/images'); // Store custom labels in 'images' folder
//         } else {
//             cb(null, 'public/uploads'); // Store other content in 'uploads'
//         }
//     },
//     filename: (req, file, cb) => {
//         if (file.fieldname === 'profileImage') {
//             cb(null, `user-${req.session.user.user_id}-${Date.now()}${path.extname(file.originalname)}`);
//         } else {
//             const fileNameWithoutExtension = path.basename(file.originalname, path.extname(file.originalname));
//             cb(null, `${fileNameWithoutExtension}-${Date.now()}${path.extname(file.originalname)}`);
//         }
//     }
// });

// const upload = multer({ storage: storage });









// // POST route to create a new box with QR code generation and privacy options
// router.post('/create-box', upload.any(), async (req, res) => {
//     const { boxName, description, content_type, label_design, privacy } = req.body;

//     try {
//         const db = await getConnection();
//         const userId = req.session.user.user_id; // Assuming user is logged in

//         let labelName;

//         // Check if the user uploaded a custom label
//         const customLabelFile = req.files.find(file => file.fieldname === 'custom_label');
//         if (customLabelFile) {
//             labelName = path.basename(customLabelFile.filename, '.jpg'); // Save label name without .jpg in the database
//         } else {
//             labelName = label_design; // Use the selected label design name from the form
//         }

//         let pin = null; // Initialize PIN variable

//         // If the box is private, generate a 6-digit PIN
//         if (privacy === 'private') {
//             pin = Math.floor(100000 + Math.random() * 900000).toString(); // Generate 6-digit PIN
//         }

//         // Insert the new box into the boxes table with the label name (without .jpg)
//         const sqlBox = 'INSERT INTO boxes (user_id, box_name, description, label_design, privacy, pin) VALUES (?, ?, ?, ?, ?, ?)';
//         const result = await db.query(sqlBox, [userId, boxName, description, labelName, privacy, pin]);
//         const boxId = result.insertId;

//         // Generate QR Code for the box
//         const qrCodeData = `http://localhost:3000/move_out/view-box/${boxId}`; // URL to view the box
//         const qrCodeFilePath = path.join(__dirname, '..', 'public', 'qrcodes', `${boxId}.png`);

//         // Generate and save the QR code image
//         QRCode.toFile(qrCodeFilePath, qrCodeData, (err) => {
//             if (err) {
//                 console.error('Error generating QR Code:', err);
//                 return res.status(500).send('Error generating QR Code');
//             }
//         });

//         // Save QR code path in the database
//         const sqlQrCode = 'INSERT INTO qr_codes (box_id, qr_code_data) VALUES (?, ?)';
//         await db.query(sqlQrCode, [boxId, `/qrcodes/${boxId}.png`]);

//         // Handle multiple files or text content
//         if (content_type === 'text') {
//             const textContents = req.body.text_content; // Array of text content
//             for (const text of textContents) {
//                 const size = Buffer.byteLength(text, 'utf8'); // Calculate size of the text
//                 const sqlContent = 'INSERT INTO contents (box_id, content_type, content_data, size) VALUES (?, ?, ?, ?)';
//                 await db.query(sqlContent, [boxId, 'text', text, size]);
//             }
//         } else if (req.files && req.files.length > 0) {
//             for (const file of req.files) {
//                 if (file.fieldname !== 'custom_label') { // Skip custom label file
//                     const contentPath = `/uploads/${file.filename}`; // Keep the original upload path
//                     const contentType = file.mimetype.startsWith('image/') ? 'image' : (file.mimetype.startsWith('audio/') ? 'audio' : 'other');
//                     const size = file.size; // Get the file size from multer

//                     const sqlContent = 'INSERT INTO contents (box_id, content_type, content_data, size) VALUES (?, ?, ?, ?)';
//                     await db.query(sqlContent, [boxId, contentType, contentPath, size]);
//                 }
//             }
//         }

//         // If the box is private, send the user the PIN via email
//         if (pin) {
//             await sendPinEmail(req.session.user.email, pin, boxName);
//         }

//         res.redirect(`/move_out/view-box/${boxId}`); // Redirect to the new box's details page
//     } catch (err) {
//         console.error('Error creating box:', err);
//         res.status(500).send('Error creating box');
//     }
// });





// // Route to view all boxes and their QR codes
// router.get('/view-boxes', async (req, res) => {
//     try {
//         const db = await getConnection();

//         // Fetch all boxes for the current user
//         const sqlBoxes = `
//             SELECT boxes.*, qr_codes.qr_code_data 
//             FROM boxes 
//             LEFT JOIN qr_codes ON boxes.box_id = qr_codes.box_id
//             WHERE boxes.user_id = ?
//         `;
//         const userId = req.session.user.user_id; // Assuming user is logged in
//         const boxes = await db.query(sqlBoxes, [userId]);

//         // Pass the title to the EJS view
//         res.render('move_out/pages/view-boxes.ejs', { boxes, title: 'My Boxes' });
//     } catch (err) {
//         console.error('Error fetching boxes:', err);
//         res.status(500).send('Error fetching boxes');
//     }
// });




// // // Route to view details of a specific box, including its content
// // router.get('/view-box/:box_id', async (req, res) => {
// //     const { box_id } = req.params;

// //     try {
// //         const db = await getConnection();

// //         // Fetch box details
// //         const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
// //         const boxes = await db.query(sqlBox, [box_id]);

// //         if (boxes.length === 0) {
// //             return res.status(404).send('Box not found');
// //         }

// //         const box = boxes[0];

// //         // Fetch content related to this box
// //         const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
// //         const contents = await db.query(sqlContent, [box_id]);

// //         // Render the box details page, passing both box details and its content
// //         res.render('move_out/pages/box_details.ejs', { box, contents, title: "Box Details" });
// //     } catch (err) {
// //         console.error('Error fetching box details:', err);
// //         res.status(500).send('Error fetching box details');
// //     }
// // });




// // Route to display box details with PIN check for private boxes
// router.get('/view-box/:box_id', async (req, res) => {
//     const { box_id } = req.params;

//     try {
//         const db = await getConnection();

//         // Fetch box details
//         const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
//         const boxes = await db.query(sqlBox, [box_id]);

//         if (boxes.length === 0) {
//             return res.status(404).send('Box not found');
//         }

//         const box = boxes[0];

//         // If the user is the owner of the box, bypass the PIN check
//         if (req.session.user && req.session.user.user_id === box.user_id) {
//             // Owner can view the box without PIN check
//             const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
//             const contents = await db.query(sqlContent, [box_id]);

//             const sqlQrCode = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
//             const qrCodeResult = await db.query(sqlQrCode, [box_id]);
//             const qrCode = qrCodeResult.length > 0 ? qrCodeResult[0].qr_code_data : null;

//             return res.render('move_out/pages/box-details.ejs', { 
//                 box, 
//                 contents, 
//                 qrCode, 
//                 user: req.session.user,
//                 title: 'Box Details' 
//             });
//         }

//         // Check if the box is private
//         if (box.privacy === 'private') {
//             // Check if the user has already entered the correct PIN in this session
//             if (!req.session.validPinForBox || req.session.validPinForBox !== box_id) {
//                 // Render the PIN input page, pass the error as null initially
//                 return res.render('move_out/pages/enter_pin.ejs', { box_id, title: 'Enter PIN', error: null });
//             }
//         }

//         // Fetch content related to this box
//         const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
//         const contents = await db.query(sqlContent, [box_id]);

//         const sqlQrCode = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
//         const qrCodeResult = await db.query(sqlQrCode, [box_id]);
//         const qrCode = qrCodeResult.length > 0 ? qrCodeResult[0].qr_code_data : null;

//         // Render the box details page
//         res.render('move_out/pages/box-details.ejs', { 
//             box, 
//             contents, 
//             qrCode, 
//             user: req.session.user,
//             title: 'Box Details' 
//         });

//     } catch (err) {
//         console.error('Error fetching box details:', err);
//         res.status(500).send('Error fetching box details');
//     }
// });





// // GET route to render the edit box page with current box details
// router.get('/edit-box/:box_id', async (req, res) => {
//     const { box_id } = req.params;

//     try {
//         const db = await getConnection();

//         // Fetch the box details
//         const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
//         const boxes = await db.query(sqlBox, [box_id]);

//         if (boxes.length === 0) {
//             return res.status(404).send('Box not found');
//         }

//         const box = boxes[0];

//         // Fetch the current contents of the box
//         const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
//         const contents = await db.query(sqlContent, [box_id]);

//         // Pass box and content data to the edit-box page
//         res.render('move_out/pages/edit-box.ejs', { box, contents, title: 'Edit Box' });
//     } catch (err) {
//         console.error('Error fetching box details:', err);
//         res.status(500).send('Error fetching box details');
//     }
// });




// // POST route to update the box details in the database (add content without removing existing ones)
// router.post('/edit-box/:box_id', upload.any(), async (req, res) => {
//     const { box_id } = req.params;
//     const { boxName, description, content_type } = req.body;

//     try {
//         const db = await getConnection();

//         // Update the box details (without changing the label design)
//         const sqlUpdateBox = 'UPDATE boxes SET box_name = ?, description = ? WHERE box_id = ?';
//         await db.query(sqlUpdateBox, [boxName, description, box_id]);

//         // Add new content
//         if (content_type === 'text' && req.body.new_content) {
//             const textContent = req.body.new_content;
//             const sqlInsertText = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
//             await db.query(sqlInsertText, [box_id, 'text', textContent]);
//         } else if (content_type === 'image' || content_type === 'audio') {
//             if (req.files && req.files.length > 0) {
//                 for (const file of req.files) {
//                     const contentPath = `/uploads/${file.filename}`;
//                     const sqlInsertFile = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
//                     await db.query(sqlInsertFile, [box_id, content_type, contentPath]);
//                 }
//             }
//         }

//         res.redirect(`/move_out/view-box/${box_id}`);
//     } catch (err) {
//         console.error('Error updating box:', err);
//         res.status(500).send('Error updating box');
//     }
// });




// // POST route to delete a box
// router.post('/delete-box/:box_id', async (req, res) => {
//     const { box_id } = req.params;

//     try {
//         const db = await getConnection();

//         // Check if the box exists before attempting to delete
//         const boxCheckSql = 'SELECT * FROM boxes WHERE box_id = ?';
//         const boxResult = await db.query(boxCheckSql, [box_id]);

//         if (boxResult.length === 0) {
//             return res.status(404).send('Box not found');
//         }

//         // Find the contents of the box (images, audio, etc.)
//         const contentsSql = 'SELECT * FROM contents WHERE box_id = ?';
//         const contents = await db.query(contentsSql, [box_id]);

//         // Delete files related to the box contents (images, audio)
//         for (const content of contents) {
//             if (content.content_type === 'image' || content.content_type === 'audio') {
//                 const filePath = path.join(__dirname, '..', 'public', content.content_data);
//                 console.log(`Attempting to delete content file: ${filePath}`);
//                 if (fs.existsSync(filePath)) {
//                     fs.unlinkSync(filePath);
//                     console.log(`Deleted content file: ${filePath}`);
//                 } else {
//                     console.log(`File not found: ${filePath}`);
//                 }
//             }
//         }

//         // Delete the QR code related to the box
//         const qrCodePath = path.join(__dirname, '..', 'public', 'qrcodes', `${box_id}.png`);
//         console.log(`Attempting to delete QR code: ${qrCodePath}`);
//         if (fs.existsSync(qrCodePath)) {
//             fs.unlinkSync(qrCodePath);
//             console.log(`Deleted QR code: ${qrCodePath}`);
//         } else {
//             console.log(`QR code not found: ${qrCodePath}`);
//         }

//         // Delete the custom label (stored in public/images)
//         const labelSql = 'SELECT label_design FROM boxes WHERE box_id = ?';
//         const labelResult = await db.query(labelSql, [box_id]);

//         const customLabel = labelResult[0] && labelResult[0].label_design;
//         if (customLabel && customLabel !== 'default') { // Check if it's not a default label
//             const labelPath = path.join(__dirname, '..', 'public', 'images', `${customLabel}.jpg`);
//             console.log(`Attempting to delete custom label: ${labelPath}`);
//             if (fs.existsSync(labelPath)) {
//                 fs.unlinkSync(labelPath);
//                 console.log(`Deleted custom label: ${labelPath}`);
//             } else {
//                 console.log(`Custom label not found: ${labelPath}`);
//             }
//         }

//         // Delete the contents, QR codes, and the box itself from the database
//         const deleteContentsSql = 'DELETE FROM contents WHERE box_id = ?';
//         await db.query(deleteContentsSql, [box_id]);

//         const deleteQrCodesSql = 'DELETE FROM qr_codes WHERE box_id = ?';
//         await db.query(deleteQrCodesSql, [box_id]);

//         const deleteBoxSql = 'DELETE FROM boxes WHERE box_id = ?';
//         await db.query(deleteBoxSql, [box_id]);

//         console.log(`Box with ID ${box_id}, its files, and related QR codes deleted successfully.`);
//         res.redirect('/move_out/view-boxes'); // Redirect to the boxes list page after deletion
//     } catch (err) {
//         console.error('Error deleting box:', err);
//         res.status(500).send('Error deleting box');
//     }
// });






// // POST route to remove content from a box
// router.post('/remove-content/:content_id', async (req, res) => {
//     const { content_id } = req.params;

//     try {
//         const db = await getConnection();

//         // Find the content by its ID
//         const sqlGetContent = 'SELECT box_id FROM contents WHERE content_id = ?';
//         const content = await db.query(sqlGetContent, [content_id]);

//         if (content.length === 0) {
//             return res.status(404).send('Content not found');
//         }

//         const box_id = content[0].box_id;

//         // Remove the content from the database
//         const sqlDeleteContent = 'DELETE FROM contents WHERE content_id = ?';
//         await db.query(sqlDeleteContent, [content_id]);

//         // Redirect back to the box edit page
//         res.redirect(`/move_out/edit-box/${box_id}`);
//     } catch (err) {
//         console.error('Error removing content:', err);
//         res.status(500).send('Error removing content');
//     }
// });


// // GET route for the profile page
// router.get('/profile', (req, res) => {
//     const user = req.session.user;  // Assuming user data is stored in session

//     if (!user) {
//         return res.redirect('/move_out/login');
//     }

//     res.render('move_out/pages/profile.ejs', { user, title: 'Profile' });
// });


// // POST route for updating profile, including profile image
// router.post('/edit-profile', upload.single('profileImage'), async (req, res) => {
//     const { name, email } = req.body;
//     const user_id = req.session.user.user_id;

//     try {
//         const db = await getConnection();
//         const updates = [];

//         // Update name and email
//         if (name) {
//             updates.push(`name = '${name}'`);
//             req.session.user.name = name; 
//         }
//         if (email) {
//             updates.push(`email = '${email}'`);
//             req.session.user.email = email; 
//         }

//         if (req.file) {
//             const profileImagePath = `/profiles/${req.file.filename}`;
//             updates.push(`profile_image = '${profileImagePath}'`);
//             req.session.user.profile_image = profileImagePath; 
//         }

//         if (updates.length > 0) {
//             const sqlUpdate = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
//             await db.query(sqlUpdate, [user_id]);
//         }

//         res.redirect('/move_out/dashboard');
//     } catch (err) {
//         console.error('Error updating profile:', err);
//         res.status(500).send('Error updating profile');
//     }
// });











// router.post('/deactivate-account', async (req, res) => {
//     const user_id = req.session.user.user_id;
//     const email = req.session.user.email;

//     try {
//         const db = await getConnection();

//         const sqlUpdate = 'UPDATE users SET status = "inactive" WHERE user_id = ?';
//         await db.query(sqlUpdate, [user_id]);

//         await sendDeletionEmail(email, user_id);

//         req.session.destroy();

//         res.redirect('/move_out/login');
//     } catch (err) {
//         console.error('Error deactivating account:', err);
//         res.status(500).send('Error deactivating account');
//     }
// });





// router.get('/delete-account/:userId', async (req, res) => {
//     const { userId } = req.params;

//     try {
//         const db = await getConnection();

//         const userCheckSql = 'SELECT * FROM users WHERE user_id = ?';
//         const userResult = await db.query(userCheckSql, [userId]);

//         if (userResult.length === 0) {
//             return res.status(404).send('User not found');
//         }

//         const user = userResult[0];

//         const profileImage = user.profile_image;
//         if (profileImage && profileImage !== '/profiles/default-profile.png') {
//             const profileImagePath = path.join(__dirname, '..', 'public', profileImage);
//             console.log(`Attempting to delete profile picture: ${profileImagePath}`);
//             if (fs.existsSync(profileImagePath)) {
//                 fs.unlinkSync(profileImagePath);
//                 console.log(`Deleted profile picture: ${profileImagePath}`);
//             } else {
//                 console.log(`Profile picture not found: ${profileImagePath}`);
//             }
//         }

//         const boxesSql = 'SELECT * FROM boxes WHERE user_id = ?';
//         const boxes = await db.query(boxesSql, [userId]);

//         for (const box of boxes) {
//             const boxId = box.box_id;

//             const qrCodeSql = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
//             const qrCodes = await db.query(qrCodeSql, [boxId]);

//             for (const qrCode of qrCodes) {
//                 const qrCodePath = path.join(__dirname, '..', 'public', qrCode.qr_code_data);
//                 if (fs.existsSync(qrCodePath)) {
//                     fs.unlinkSync(qrCodePath);
//                     console.log(`Deleted QR code: ${qrCodePath}`);
//                 }
//             }

//             const customLabel = box.label_design;
//             if (customLabel && customLabel !== 'default') {
//                 const labelPath = path.join(__dirname, '..', 'public', 'images', `${customLabel}.jpg`);
//                 if (fs.existsSync(labelPath)) {
//                     fs.unlinkSync(labelPath);
//                     console.log(`Deleted custom label: ${labelPath}`);
//                 }
//             }

//             const contentsSql = 'SELECT * FROM contents WHERE box_id = ?';
//             const contents = await db.query(contentsSql, [boxId]);

//             for (const content of contents) {
//                 if (content.content_type === 'image' || content.content_type === 'audio') {
//                     const contentFilePath = path.join(__dirname, '..', 'public', content.content_data);
//                     if (fs.existsSync(contentFilePath)) {
//                         fs.unlinkSync(contentFilePath);
//                         console.log(`Deleted uploaded content: ${contentFilePath}`);
//                     }
//                 }
//             }

//             const deleteContentsSql = 'DELETE FROM contents WHERE box_id = ?';
//             await db.query(deleteContentsSql, [boxId]);

//             const deleteQrCodesSql = 'DELETE FROM qr_codes WHERE box_id = ?';
//             await db.query(deleteQrCodesSql, [boxId]);

//             const deleteBoxSql = 'DELETE FROM boxes WHERE box_id = ?';
//             await db.query(deleteBoxSql, [boxId]);

//             console.log(`Box with ID ${boxId} and its files deleted successfully.`);
//         }

//         const deleteUserSql = 'DELETE FROM users WHERE user_id = ?';
//         await db.query(deleteUserSql, [userId]);
//         console.log('Deleting user with ID:', userId);

//         let data = {
//             title: 'Account Deleted',
//             message: 'Your account and all associated data have been successfully deleted.'
//         };
//         res.render('move_out/pages/delete-confirmation.ejs', data);
//     } catch (error) {
//         console.error('Error deleting user:', error); 
//         res.status(500).send('Internal Server Error');
//     }
// });










// router.post('/share-label/:box_id', async (req, res) => {
//     const { box_id } = req.params;
//     const { email } = req.body;
//     const shared_by_user_id = req.session.user.user_id; 

//     try {
//         const db = await getConnection();

//         const shareSql = 'INSERT INTO shared_labels (box_id, shared_with_email, shared_by_user_id) VALUES (?, ?, ?)';
//         await db.query(shareSql, [box_id, email, shared_by_user_id]);

//         await sendShareNotificationEmail(email, box_id);

//         res.redirect(`/move_out/view-box/${box_id}`);
//     } catch (err) {
//         console.error('Error sharing label:', err);
//         res.status(500).send('Error sharing label');
//     }
// });





// router.post('/access-private-box/:box_id', async (req, res) => {
//     const { box_id } = req.params;
//     const { pin } = req.body;

//     try {
//         const db = await getConnection();

//         // Fetch the box details and verify the PIN
//         const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
//         const boxes = await db.query(sqlBox, [box_id]);

//         if (boxes.length === 0) {
//             return res.status(404).send('Box not found');
//         }

//         const box = boxes[0];

//         if (box.privacy === 'private' && box.pin !== pin) {
//             return res.status(401).send('Invalid PIN. Please try again.');
//         }

//         const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
//         const contents = await db.query(sqlContent, [box_id]);

//         res.render('move_out/pages/box-details.ejs', { box, contents, qrCode: null, user: req.session.user, title: 'Box Details' });
//     } catch (err) {
//         console.error('Error accessing private box:', err);
//         res.status(500).send('Error accessing private box');
//     }
// });



// router.post('/verify-pin/:box_id', async (req, res) => {
//     const { box_id } = req.params;
//     const { pin } = req.body;

//     try {
//         const db = await getConnection();

//         const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
//         const boxes = await db.query(sqlBox, [box_id]);

//         if (boxes.length === 0) {
//             return res.status(404).send('Box not found');
//         }

//         const box = boxes[0];

//         if (box.pin !== pin) {
//             return res.render('move_out/pages/enter_pin.ejs', { box_id, title: 'Enter PIN', error: 'Incorrect PIN. Please try again.' });
//         }

//         req.session.validPinForBox = box_id;

//         res.redirect(`/move_out/view-box/${box_id}`);
//     } catch (err) {
//         console.error('Error verifying PIN:', err);
//         res.status(500).send('Error verifying PIN');
//     }
// });



// router.get('/users', async (req, res) => {
//     try {
//         const users = await getAllUsers(); 
//         res.render('move_out/pages/users.ejs', { users, title: 'Users List' });
//     } catch (error) {
//         console.error('Error fetching users:', error);
//         res.status(500).send('Error fetching users.');
//     }
// });

// router.get('/user/:user_id/boxes', async (req, res) => {
//     const { user_id } = req.params;

//     try {
//         const boxes = await getPublicBoxesByUser(user_id); 
        
//         if (boxes.length === 0) {
//             return res.render('move_out/pages/no_public_boxes.ejs', { title: 'No Public Boxes' });
//         }

//         res.render('move_out/pages/public_boxes.ejs', { boxes, title: 'Public Boxes' });
//     } catch (error) {
//         console.error('Error fetching public boxes:', error);
//         res.status(500).send('Error fetching public boxes.');
//     }
// });




// router.get('/shared-labels', async (req, res) => {
//     const userEmail = req.session.user.email; 

//     try {
//         const sharedBoxes = await getSharedLabelsByEmail(userEmail); 
//         if (sharedBoxes.length === 0) {
//             return res.render('move_out/pages/no_shared_boxes.ejs', { title: 'No Shared Boxes' });
//         }
//         res.render('move_out/pages/shared_boxes.ejs', { sharedBoxes, title: 'Shared Boxes' });
//     } catch (error) {
//         console.error('Error fetching shared boxes:', error);
//         res.status(500).send('Error fetching shared boxes.');
//     }
// });




// // -------------------------------------------------------------------------------------------------------------------------------------------------------------------
// // Admin Routes


// router.get('/admin', async (req, res) => {
//         res.redirect('/move_out/admin/dashboard'); 
// });



// // Admin Dashboard Route
// router.get('/admin/dashboard', async (req, res) => {
//     if (!req.session.user || !req.session.user.is_admin) {
//         res.redirect('/move_out/login'); 
//         // return res.status(403).send('Access Denied');
//     }

//     try {
//         const users = await getAllUsers(); 
//         res.render('move_out/admin/dashboard.ejs', { users, title: 'Admin Dashboard' });
//     } catch (error) {
//         console.error('Error fetching users:', error);
//         res.status(500).send('Internal Server Error');
//     }
// });




// router.get('/admin/users', async (req, res) => {
//     try {
//         const users = await getAllUsers();
//         res.render('move_out/admin/users.ejs', { users, title: 'All Users' });
//     } catch (error) {
//         console.error('Error fetching users:', error);
//         res.status(500).send('Error fetching users.');
//     }
// });




// router.get('/admin/send-marketing-email', (req, res) => {
//     res.render('move_out/admin/send-marketing-email.ejs', { title: 'Send Marketing Email' });
// });





// router.post('/admin/activate-deactivate/:userId', async (req, res) => {
//     const { userId } = req.params;
//     console.log(`Request received for user ${req.params.userId}`);
    
//     try {
//         const result = await toggleUserStatus(userId);
//         if (result.success) {
//             res.redirect('/move_out/admin/users'); // Redirect back to user list
//         }
//     } catch (error) {
//         console.error('Error updating user status:', error);
//         res.status(500).send('Error updating user status');
//     }
// });



// // // Route to view storage usage
// // router.get('/admin/storage-usage', async (req, res) => {
// //     try {
// //         const storageUsage = await getStorageUsage();
// //         res.render('move_out/admin/storage-usage.ejs', { storageUsage, title: 'Storage Usage' });
// //     } catch (error) {
// //         console.error('Error fetching storage usage:', error); // Log the full error
// //         res.status(500).send(`Error fetching storage usage: ${error.message}`); // Send the error message back
// //     }
// // });






// module.exports = router;
