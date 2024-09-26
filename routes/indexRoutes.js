const express = require("express");
const router = express.Router();
const { getConnection, createUser, sendVerificationEmail, authenticateUser, verifyUserCode, createBox } = require("./../src/cli.js");
const session = require('express-session');
const crypto = require('crypto');

const QRCode = require('qrcode');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

// "use strict";
const config = require("../config/db/move_out.json");
const mysql = require("promise-mysql");


// Initialize session middleware
router.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));

// Redirect to registration
router.get('/', (req, res) => {
    res.redirect('/move_out/register');
});

// Route: Render the registration page
router.get('/register', (req, res) => {
    let data = {};
    data.title = "Register";
    res.render('move_out/pages/register.ejs', data);
});


// POST route for registration with resend verification option
router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    try {
        // Create user and generate verification code (store in unverified_users)
        const { verificationCode } = await createUser(email, password, name);

        // Send verification email
        await sendVerificationEmail(email, verificationCode);

        // Render a success page with a button to redirect to the verify route
        let data = {
            title: 'Registration Successful',
            message: 'Registration successful! Please check your email for the verification code.',
            email: email  // Pass the email so it can be used on the verify page if needed
        };
        res.render('move_out/pages/send_to_verify.ejs', data);
    } catch (err) {
        if (err.message.includes('already registered')) {
            // Render the resend verification page
            let data = {
                title: 'Resend Verification Code',
                email: email
            };
            res.render('move_out/pages/resend_verification.ejs', data);
        } else if (err.message.includes('already exists')) {
            // Render a page that shows "User already exists" with a button to login
            let data = {
                title: 'User Already Exists',
                message: 'User already exists with this email.',
                email: email
            };
            res.render('move_out/pages/send_to_login.ejs', data);
        } else {
            console.error(err);
            res.status(500).send('Error creating user');
        }
    }
});




// Route: Render the verification page (to enter the code)
router.get('/verify', (req, res) => {
    let data = {};
    data.title = "Verify Email";
    res.render('move_out/pages/verify.ejs', data);
});

// POST route to verify the 8-digit code
router.post('/verify', async (req, res) => {
    const { verificationCode } = req.body;

    try {
        // Call the verifyUserCode function from cli.js
        const result = await verifyUserCode(verificationCode);

        if (!result.success) {
            return res.status(400).send(result.message);
        }

        // Render a success message with a button to redirect to the login route
        let data = {
            title: 'Email Verified',
            message: 'Email successfully verified! You can now log in.'
        };
        res.render('move_out/pages/send_to_login.ejs', data);
    } catch (err) {
        console.error('Error verifying email:', err);
        res.status(500).send('Error verifying email');
    }
});






// POST route to resend verification email
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    try {
        const db = await mysql.createConnection(config);
        console.log('Checking unverified_users table for email:', email);

        // Find the user in the unverified_users table
        const sql = 'SELECT * FROM unverified_users WHERE email = ?';
        const result = await db.query(sql, [email]);

        if (result.length === 0) {
            console.log('User not found in unverified_users or already verified.');
            return res.status(400).send('User not found or already verified.');
        }

        const user = result[0];
        console.log('User found:', user);

        // Use the existing 8-digit verification code
        const verificationCode = user.verification_code;

        console.log('Using existing verification code:', verificationCode);

        // Send the verification email with the existing code
        await sendVerificationEmail(email, verificationCode);
        console.log('Verification email sent successfully to:', email);

        // Render a response after successful email send
        let data = {
            title: 'Verification Email Sent',
            message: 'Verification email resent! Please check your email.'
        };
        res.render('move_out/pages/verification_sent.ejs', data);
    } catch (err) {
        console.error('Error resending verification email:', err);
        res.status(500).send('Error resending verification email');
    }
});




// Route: Render the login page
router.get('/login', (req, res) => {
    let data = {};
    data.title = "Login";
    res.render('move_out/pages/login.ejs', data);
});

// POST route for login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await authenticateUser(email, password);

        if (result.success) {
            // Check if the user is verified
            if (!result.user.is_verified) {
                return res.status(401).send('Please verify your email before logging in.');
            }

            // Save user info to session
            req.session.user = result.user;

            // Check if there's a redirect URL (e.g., when scanning QR code)
            const redirectUrl = req.query.redirect || '/move_out/dashboard';

            // Redirect to the original page or dashboard if no redirect URL is provided
            res.redirect(redirectUrl);
        } else {
            // Render the login error page with the appropriate message
            let data = {
                title: 'Login Error',  // Set the title for the error page
                message: result.message || 'Invalid login credentials. Please try again.'
            };
            res.render('move_out/pages/login-error.ejs', data); // Render the new error page
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});



// Route: Render dashboard if logged in
router.get('/dashboard', (req, res) => {
    if (req.session.user) {
        let data = {
            title: 'Dashboard',  // Set the title
            user: req.session.user
        };
        res.render('move_out/pages/dashboard.ejs', data);
    } else {
        res.redirect('/move_out/login');
    }2
});


// Route: Handle logout
router.get('/logout', (req, res) => {
    req.session.destroy(); // Destroy the session
    res.redirect('/move_out/login');
});



// Route to render the box creation form
router.get('/create-box', (req, res) => {
    let data = {};
    data.title = "Create New Box";
    res.render('move_out/pages/create_box.ejs', data);
});



// Set up storage for multer (file uploads)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads'); // Folder to store uploaded files
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname)); // Unique file name
    }
});

const upload = multer({ storage: storage });

// POST route to create a new box with QR code generation
router.post('/create-box', upload.any(), async (req, res) => {
    const { boxName, description, content_type, label_design } = req.body;

    try {
        const db = await getConnection();

        // Insert the new box into the boxes table
        const sqlBox = 'INSERT INTO boxes (user_id, box_name, description, label_design) VALUES (?, ?, ?, ?)';
        const userId = req.session.user.user_id; // Assuming user is logged in
        const result = await db.query(sqlBox, [userId, boxName, description, label_design]);
        const boxId = result.insertId;

        // Generate QR Code for the box
        const qrCodeData = `http://localhost:3000/move_out/view-box/${boxId}`; // URL to view the box
        const qrCodeFilePath = path.join(__dirname, '..', 'public', 'qrcodes', `${boxId}.png`);

        // Generate and save the QR code image
        QRCode.toFile(qrCodeFilePath, qrCodeData, (err) => {
            if (err) {
                console.error('Error generating QR Code:', err);
                return res.status(500).send('Error generating QR Code');
            }
        });

        // Save QR code path in the database
        const sqlQrCode = 'INSERT INTO qr_codes (box_id, qr_code_data) VALUES (?, ?)';
        await db.query(sqlQrCode, [boxId, `/qrcodes/${boxId}.png`]);

        // Handle multiple files or text content
        if (content_type === 'text') {
            const textContents = req.body.text_content; // Array of text content
            for (const text of textContents) {
                const sqlContent = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
                await db.query(sqlContent, [boxId, 'text', text]);
            }
        } else if (content_type === 'image' || content_type === 'audio') {
            for (const file of req.files) {
                // Insert each file as a separate content entry
                const contentPath = `/uploads/${file.filename}`;
                const sqlContent = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
                await db.query(sqlContent, [boxId, content_type, contentPath]);
            }
        }

        res.redirect(`/move_out/view-box/${boxId}`); // Redirect to the new box's details page
    } catch (err) {
        console.error('Error creating box:', err);
        res.status(500).send('Error creating box');
    }
});




// Route to view all boxes and their QR codes
router.get('/view-boxes', async (req, res) => {
    try {
        const db = await getConnection();

        // Fetch all boxes for the current user
        const sqlBoxes = `
            SELECT boxes.*, qr_codes.qr_code_data 
            FROM boxes 
            LEFT JOIN qr_codes ON boxes.box_id = qr_codes.box_id
            WHERE boxes.user_id = ?
        `;
        const userId = req.session.user.user_id; // Assuming user is logged in
        const boxes = await db.query(sqlBoxes, [userId]);

        // Pass the title to the EJS view
        res.render('move_out/pages/view-boxes.ejs', { boxes, title: 'My Boxes' });
    } catch (err) {
        console.error('Error fetching boxes:', err);
        res.status(500).send('Error fetching boxes');
    }
});




// // Route to view details of a specific box, including its content
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

//         // Fetch content related to this box
//         const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
//         const contents = await db.query(sqlContent, [box_id]);

//         // Render the box details page, passing both box details and its content
//         res.render('move_out/pages/box_details.ejs', { box, contents, title: "Box Details" });
//     } catch (err) {
//         console.error('Error fetching box details:', err);
//         res.status(500).send('Error fetching box details');
//     }
// });




// Route to display box details and allow editing if logged in
router.get('/view-box/:box_id', async (req, res) => {
    const { box_id } = req.params;

    try {
        const db = await getConnection();

        // Fetch box details
        const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
        const boxes = await db.query(sqlBox, [box_id]);

        if (boxes.length === 0) {
            return res.status(404).send('Box not found');
        }

        const box = boxes[0];

        // Fetch content related to this box
        const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
        const contents = await db.query(sqlContent, [box_id]);

        // Fetch the QR code for this box
        const sqlQrCode = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
        const qrCodeResult = await db.query(sqlQrCode, [box_id]);
        const qrCode = qrCodeResult.length > 0 ? qrCodeResult[0].qr_code_data : null;

        // Pass the box, contents, qrCode, and session info (if user is logged in)
        res.render('move_out/pages/box-details.ejs', { 
            box, 
            contents, 
            qrCode, 
            user: req.session.user,  // Pass user to check if logged in
            title: 'Box Details' 
        });
    } catch (err) {
        console.error('Error fetching box details:', err);
        res.status(500).send('Error fetching box details');
    }
});




// GET route to render the edit box page with current box details
router.get('/edit-box/:box_id', async (req, res) => {
    const { box_id } = req.params;

    try {
        const db = await getConnection();

        // Fetch the box details
        const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
        const boxes = await db.query(sqlBox, [box_id]);

        if (boxes.length === 0) {
            return res.status(404).send('Box not found');
        }

        const box = boxes[0];

        // Fetch the current contents of the box
        const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
        const contents = await db.query(sqlContent, [box_id]);

        // Pass box and content data to the edit-box page
        res.render('move_out/pages/edit-box.ejs', { box, contents, title: 'Edit Box' });
    } catch (err) {
        console.error('Error fetching box details:', err);
        res.status(500).send('Error fetching box details');
    }
});




// POST route to update the box details in the database (add content without removing existing ones)
router.post('/edit-box/:box_id', upload.any(), async (req, res) => {
    const { box_id } = req.params;
    const { boxName, description, content_type } = req.body;

    try {
        const db = await getConnection();

        // Update the box details (without changing the label design)
        const sqlUpdateBox = 'UPDATE boxes SET box_name = ?, description = ? WHERE box_id = ?';
        await db.query(sqlUpdateBox, [boxName, description, box_id]);

        // Add new content
        if (content_type === 'text' && req.body.new_content) {
            const textContent = req.body.new_content;
            const sqlInsertText = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
            await db.query(sqlInsertText, [box_id, 'text', textContent]);
        } else if (content_type === 'image' || content_type === 'audio') {
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const contentPath = `/uploads/${file.filename}`;
                    const sqlInsertFile = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
                    await db.query(sqlInsertFile, [box_id, content_type, contentPath]);
                }
            }
        }

        res.redirect(`/move_out/view-box/${box_id}`);
    } catch (err) {
        console.error('Error updating box:', err);
        res.status(500).send('Error updating box');
    }
});


// POST route to remove content from a box
router.post('/remove-content/:content_id', async (req, res) => {
    const { content_id } = req.params;

    try {
        const db = await getConnection();

        // Find the content by its ID
        const sqlGetContent = 'SELECT box_id FROM contents WHERE content_id = ?';
        const content = await db.query(sqlGetContent, [content_id]);

        if (content.length === 0) {
            return res.status(404).send('Content not found');
        }

        const box_id = content[0].box_id;

        // Remove the content from the database
        const sqlDeleteContent = 'DELETE FROM contents WHERE content_id = ?';
        await db.query(sqlDeleteContent, [content_id]);

        // Redirect back to the box edit page
        res.redirect(`/move_out/edit-box/${box_id}`);
    } catch (err) {
        console.error('Error removing content:', err);
        res.status(500).send('Error removing content');
    }
});


// GET route for the profile page
router.get('/profile', (req, res) => {
    const user = req.session.user;  // Assuming user data is stored in session

    if (!user) {
        return res.redirect('/move_out/login');
    }

    res.render('move_out/pages/profile.ejs', { user, title: 'Profile' });
});

// POST route for updating profile
router.post('/edit-profile', async (req, res) => {
    const { name, email } = req.body;
    const user_id = req.session.user.user_id;

    try {
        const db = await getConnection();
        const sqlUpdate = 'UPDATE users SET name = ?, email = ? WHERE user_id = ?';
        await db.query(sqlUpdate, [name, email, user_id]);

        // Update session data
        req.session.user.name = name;
        req.session.user.email = email;

        res.redirect('/move_out/profile');
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).send('Error updating profile');
    }
});


module.exports = router;
