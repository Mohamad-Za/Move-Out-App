const express = require("express");
const router = express.Router();
const { getConnection, createUser, sendVerificationEmail, authenticateUser, verifyUserCode,
    createBox, sendDeletionEmail, sendShareNotificationEmail, sendPinEmail, getAllUsers, getPublicBoxesByUser ,
    saveCustomLabel, getSharedLabelsByEmail, updateLastActivity, sendMarketingEmail, toggleUserStatus, getStorageUsage} = require("./../src/cli.js");
const session = require('express-session');
const crypto = require('crypto');

const QRCode = require('qrcode');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const passport = require('passport');


const config = require("../config/db/move_out.json");
const mysql = require("promise-mysql");



router.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: true
}));


router.get('/', (req, res) => {
    res.redirect('/move_out/register');
});   


router.get('/register', (req, res) => {
    let data = {};
    data.title = "Register";
    res.render('move_out/pages/register.ejs', data);
});





router.post('/register', async (req, res) => {
    const { email, password, name } = req.body;

    
    const passwordPattern = /^(?=.*[0-9])(?=.*[a-zA-Z]).{6,}$/; 
    if (!passwordPattern.test(password)) {
        return res.render('move_out/pages/register.ejs', {
            title: 'Register',
            errorMessage: 'Password must be at least 6 characters long and include both letters and numbers.'
        });
    }

    try {
        
        const { verificationCode } = await createUser(email, password, name);

        
        await sendVerificationEmail(email, verificationCode);

        
        let data = {
            title: 'Registration Successful',
            message: 'Registration successful! Please check your email for the verification code.',
            email: email  
        };
        res.render('move_out/pages/send_to_verify.ejs', data);
    } catch (err) {
        if (err.message.includes('already registered')) {
            
            let data = {
                title: 'Resend Verification Code',
                email: email
            };
            res.render('move_out/pages/resend_verification.ejs', data);
        } else if (err.message.includes('already exists')) {
            
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







router.get('/auth/google', (req, res, next) => {
    console.log('Google authentication initiated'); 
    passport.authenticate('google', {
        scope: ['profile', 'email'] 
    })(req, res, next);
});



router.get('/auth/google/callback', 
    passport.authenticate('google', { 
        failureRedirect: '/move_out/login?error=deactivated', 
        failureMessage: true 
    }),
    (req, res) => {
        if (req.user) {
            
            if (req.user.status === 'inactive') {
                req.logout((err) => {
                    if (err) { return next(err); }
                    return res.redirect('/move_out/login?error=deactivated');
                });
            } else {
                
                req.session.user = req.user; 
                res.redirect('/move_out/dashboard');
            }
        } else {
            res.redirect('/move_out/login?error=deactivated');
        }
    }
);










router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/move_out/login');
    });
});



router.get('/verify', (req, res) => {
    let data = {};
    data.title = "Verify Email";
    res.render('move_out/pages/verify.ejs', data);
});


router.post('/verify', async (req, res) => {
    const { verificationCode } = req.body;

    try {
        
        const result = await verifyUserCode(verificationCode);

        if (!result.success) {
            return res.status(400).send(result.message);
        }

        
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







router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    try {
        const db = await mysql.createConnection(config);
        console.log('Checking unverified_users table for email:', email);

        
        const sql = 'SELECT * FROM unverified_users WHERE email = ?';
        const result = await db.query(sql, [email]);

        if (result.length === 0) {
            console.log('User not found in unverified_users or already verified.');
            return res.status(400).send('User not found or already verified.');
        }

        const user = result[0];
        console.log('User found:', user);

        
        const verificationCode = user.verification_code;

        console.log('Using existing verification code:', verificationCode);

        
        await sendVerificationEmail(email, verificationCode);
        console.log('Verification email sent successfully to:', email);

        
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





router.get('/login', (req, res) => {
    let data = {};
    data.title = "Login";
    res.render('move_out/pages/login.ejs', data);
});


router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const result = await authenticateUser(email, password);

        if (result.success) {
            const db = await getConnection();
            const sql = 'SELECT * FROM users WHERE user_id = ?';
            const [user] = await db.query(sql, [result.user.user_id]);

            
            req.session.user = user;

            
            if (user.is_admin) {
                return res.redirect('/move_out/admin/dashboard');
            }

            
            const redirectUrl = req.query.redirect || '/move_out/dashboard';

            
            return res.redirect(redirectUrl);
        }

        
        let error = 'invalid';
        if (result.reason === 'deactivated') {
            error = 'deactivated';
        }

        
        return res.redirect(`/move_out/login?error=${error}`);
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/dashboard', (req, res) => {
    // console.log('Session User:', req.session.user); 
    if (req.session.user) {
        let data = {
            title: 'Dashboard',
            user: req.session.user
        };
        res.render('move_out/pages/dashboard.ejs', data);
    } else {
        res.redirect('/move_out/login');
    }
});


router.get('/logout', (req, res) => {
    req.session.destroy(); 
    res.redirect('/move_out/login');
});


router.get('/create-box', (req, res) => {
    let data = {};
    data.title = "Create New Box";
    res.render('move_out/pages/create_box.ejs', data);
});


const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'profileImage') {
            cb(null, 'public/profiles'); 
        } else if (file.fieldname === 'custom_label') {
            cb(null, 'public/images'); 
        } else if (file.fieldname === 'insurance_logo') {
            cb(null, 'public/insurance_logos');  
        } else {
            cb(null, 'public/uploads'); 
        }
    },
    filename: (req, file, cb) => {
        if (file.fieldname === 'profileImage') {
            cb(null, `user-${req.session.user.user_id}-${Date.now()}${path.extname(file.originalname)}`);
        } else {
            const fileNameWithoutExtension = path.basename(file.originalname, path.extname(file.originalname));
            cb(null, `${fileNameWithoutExtension}-${Date.now()}${path.extname(file.originalname)}`);
        }
    }
});

const upload = multer({ storage: storage });


router.post('/create-box', upload.any(), async (req, res) => {
    const { boxName, content_type, label_design, privacy } = req.body;

    try {
        const db = await getConnection();
        const userId = req.session.user.user_id; 

        let labelName;

        
        const customLabelFile = req.files.find(file => file.fieldname === 'custom_label');
        if (customLabelFile) {
            labelName = path.basename(customLabelFile.filename, '.jpg'); 
        } else {
            labelName = label_design; 
        }

        let pin = null; 

        
        if (privacy === 'private') {
            pin = Math.floor(100000 + Math.random() * 900000).toString(); 
        }

        
        const sqlBox = 'INSERT INTO boxes (user_id, box_name, label_design, privacy, pin, box_type) VALUES (?, ?, ?, ?, ?, ?)';
        const result = await db.query(sqlBox, [userId, boxName, labelName, privacy, pin, 'normal']);
        const boxId = result.insertId;

        
        const qrCodeData = `http://localhost:3000/move_out/view-box/${boxId}`;
        const qrCodeFilePath = path.join(__dirname, '..', 'public', 'qrcodes', `${boxId}.png`);

        
        QRCode.toFile(qrCodeFilePath, qrCodeData, (err) => {
            if (err) {
                console.error('Error generating QR Code:', err);
                return res.status(500).send('Error generating QR Code');
            }
        });

        
        const sqlQrCode = 'INSERT INTO qr_codes (box_id, qr_code_data) VALUES (?, ?)';
        await db.query(sqlQrCode, [boxId, `/qrcodes/${boxId}.png`]);

        
        if (content_type === 'text') {
            const textContents = req.body.text_content; 
            for (const text of textContents) {
                const size = Buffer.byteLength(text, 'utf8'); 
                const sqlContent = 'INSERT INTO contents (box_id, content_type, content_data, size) VALUES (?, ?, ?, ?)';
                await db.query(sqlContent, [boxId, 'text', text, size]);
            }
        } else if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                if (file.fieldname !== 'custom_label') { 
                    const contentPath = `/uploads/${file.filename}`; 
                    const contentType = file.mimetype.startsWith('image/') ? 'image' : (file.mimetype.startsWith('audio/') ? 'audio' : 'other');
                    const size = file.size; 

                    const sqlContent = 'INSERT INTO contents (box_id, content_type, content_data, size) VALUES (?, ?, ?, ?)';
                    await db.query(sqlContent, [boxId, contentType, contentPath, size]);
                }
            }
        }

        
        if (pin) {
            await sendPinEmail(req.session.user.email, pin, boxName);
        }

        res.redirect(`/move_out/view-box/${boxId}`); 
    } catch (err) {
        console.error('Error creating box:', err);
        res.status(500).send('Error creating box');
    }
});




router.get('/create-insurance-box', (req, res) => {
    let data = {};
    data.title = "Create Insurance Box";
    res.render('move_out/pages/create_insurance_box.ejs', data);
});





router.post('/create-insurance-box', upload.any(), async (req, res) => {
    const { boxName, item_names, item_values, currency, label_design, privacy } = req.body;

    try {
        const db = await getConnection();
        const userId = req.session.user.user_id;

        // Handle pin for private boxes
        let pin = null;
        if (privacy === 'private') {
            pin = Math.floor(100000 + Math.random() * 900000).toString();
        }

        // Handle custom label upload if selected
        let finalLabelDesign = label_design;
        const customLabelFile = req.files.find(file => file.fieldname === 'custom_label');
        if (customLabelFile) {
            finalLabelDesign = path.basename(customLabelFile.filename, '.jpg'); 
        }

        // Handle insurance company logo upload
        let insuranceLogo = null;
        const insuranceLogoFile = req.files.find(file => file.fieldname === 'insurance_logo');
        if (insuranceLogoFile) {
            insuranceLogo = `/insurance_logos/${insuranceLogoFile.filename}`;
        }

        // Insert the insurance box into the boxes table with the selected label design and logo
        const sqlBox = 'INSERT INTO boxes (user_id, box_name, label_design, privacy, pin, box_type, insurance_logo) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const result = await db.query(sqlBox, [userId, boxName, finalLabelDesign, privacy, pin, 'insurance', insuranceLogo]);
        const boxId = result.insertId;

        // Save items in the insurance_box_items table
        for (let i = 0; i < item_names.length; i++) {
            const sqlItem = 'INSERT INTO insurance_box_items (box_id, item_name, item_value, currency) VALUES (?, ?, ?, ?)';
            await db.query(sqlItem, [boxId, item_names[i], parseFloat(item_values[i]), currency]);
        }

        // Generate QR Code
        const qrCodeData = `http://localhost:3000/move_out/view-box/${boxId}`;
        const qrCodeFilePath = path.join(__dirname, '..', 'public', 'qrcodes', `${boxId}.png`);

        QRCode.toFile(qrCodeFilePath, qrCodeData, (err) => {
            if (err) {
                console.error('Error generating QR Code:', err);
                return res.status(500).send('Error generating QR Code');
            }
        });

        const sqlQrCode = 'INSERT INTO qr_codes (box_id, qr_code_data) VALUES (?, ?)';
        await db.query(sqlQrCode, [boxId, `/qrcodes/${boxId}.png`]);

        // Send PIN email if applicable
        if (pin) {
            await sendPinEmail(req.session.user.email, pin, boxName);
        }

        res.redirect(`/move_out/view-box/${boxId}`);
    } catch (err) {
        console.error('Error creating insurance box:', err);
        res.status(500).send('Error creating insurance box');
    }
});










router.get('/view-boxes', async (req, res) => {
    try {
        const db = await getConnection();




        const sqlBoxes = `
            SELECT boxes.*, qr_codes.qr_code_data 
            FROM boxes 
            LEFT JOIN qr_codes ON boxes.box_id = qr_codes.box_id
            WHERE boxes.user_id = ?
        `;
        const userId = req.session.user.user_id; 
        const boxes = await db.query(sqlBoxes, [userId]);

        const sqlUser = 'SELECT status FROM users WHERE user_id = ?';
        const userResult = await db.query(sqlUser, [userId]);

        if (userResult.length === 0 || userResult[0].status !== 'active') {
            return res.status(403).send('Your account is deactivated.');
        }


        // Fetch the first three items for each insurance box
        for (let box of boxes) {
            if (box.box_type === 'insurance') {
                const sqlItems = `
                    SELECT item_name, item_value, currency 
                    FROM insurance_box_items 
                    WHERE box_id = ? 
                    LIMIT 3`;
                box.items = await db.query(sqlItems, [box.box_id]);
            }
        }

        res.render('move_out/pages/view-boxes.ejs', { boxes, title: 'My Boxes' });
    } catch (err) {
        console.error('Error fetching boxes:', err);
        res.status(500).send('Error fetching boxes');
    }
});



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

        // Check if it's an insurance box based on box_type
        if (box.box_type === 'insurance') {
            // Fetch insurance items from the insurance_box_items table
            const sqlItems = 'SELECT * FROM insurance_box_items WHERE box_id = ?';
            const insuranceItems = await db.query(sqlItems, [box_id]);

            // Fetch the QR code
            const sqlQrCode = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
            const qrCodeResult = await db.query(sqlQrCode, [box_id]);
            const qrCode = qrCodeResult.length > 0 ? qrCodeResult[0].qr_code_data : null;

            // Fetch the insurance company logo (optional)
            let insuranceLogo = null;
            const logoPath = `/uploads/${box.insurance_logo}`;
            if (box.insurance_logo && fs.existsSync(path.join(__dirname, '..', 'public', logoPath))) {
                insuranceLogo = logoPath;
            }

            return res.render('move_out/pages/insurance-box-details.ejs', { 
                box, 
                insuranceItems, 
                insuranceLogo, 
                qrCode, 
                user: req.session.user,
                title: 'Insurance Box Details' 
            });
        }

        // Logic for normal boxes (existing code, unchanged)
        if (req.session.user && req.session.user.user_id === box.user_id) {
            const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
            const contents = await db.query(sqlContent, [box_id]);

            const sqlQrCode = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
            const qrCodeResult = await db.query(sqlQrCode, [box_id]);
            const qrCode = qrCodeResult.length > 0 ? qrCodeResult[0].qr_code_data : null;

            return res.render('move_out/pages/box-details.ejs', { 
                box, 
                contents, 
                qrCode, 
                user: req.session.user,
                title: 'Box Details' 
            });
        }

        // Handling for private boxes (existing code, unchanged)
        if (box.privacy === 'private') {
            if (!req.session.validPinForBox || req.session.validPinForBox !== box_id) {
                return res.render('move_out/pages/enter_pin.ejs', { box_id, title: 'Enter PIN', error: null });
            }
        }

        const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
        const contents = await db.query(sqlContent, [box_id]);

        const sqlQrCode = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
        const qrCodeResult = await db.query(sqlQrCode, [box_id]);
        const qrCode = qrCodeResult.length > 0 ? qrCodeResult[0].qr_code_data : null;

        res.render('move_out/pages/box-details.ejs', { 
            box, 
            contents, 
            qrCode, 
            user: req.session.user,
            title: 'Box Details' 
        });

    } catch (err) {
        console.error('Error fetching box details:', err);
        res.status(500).send('Error fetching box details');
    }
});







// router.get('/view-insurance-box/:box_id', async (req, res) => {
//     const { box_id } = req.params;

//     try {
//         const db = await getConnection();

//         // Fetch the box details
//         const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
//         const [box] = await db.query(sqlBox, [box_id]);

//         if (!box) {
//             return res.status(404).send('Insurance Box not found');
//         }

//         // Fetch the items for this insurance box
//         const sqlItems = 'SELECT * FROM insurance_box_items WHERE box_id = ?';
//         const insuranceItems = await db.query(sqlItems, [box_id]);

//         // Fetch the insurance company logo (optional)
//         let insuranceLogo = null;
//         const logoPath = `/uploads/${box.insurance_logo}`;
//         if (fs.existsSync(path.join(__dirname, '..', 'public', logoPath))) {
//             insuranceLogo = logoPath;
//         }

//         // Fetch the QR code
//         const sqlQrCode = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
//         const [qrCodeResult] = await db.query(sqlQrCode, [box_id]);
//         const qrCode = qrCodeResult ? qrCodeResult.qr_code_data : null;

//         // Render the page and pass the title variable
//         res.render('move_out/pages/insurance-box-details.ejs', {
//             box,
//             insuranceItems,
//             insuranceLogo,
//             qrCode,
//             user: req.session.user,
//             title: "Insurance Box Details"  // Add the title here
//         });
//     } catch (err) {
//         console.error('Error fetching insurance box details:', err);
//         res.status(500).send('Error fetching insurance box details');
//     }
// });





router.get('/edit-box/:box_id', async (req, res) => {
    const { box_id } = req.params;

    try {
        const db = await getConnection();

        const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
        const boxes = await db.query(sqlBox, [box_id]);

        if (boxes.length === 0) {
            return res.status(404).send('Box not found');
        }

        const box = boxes[0];

        if (box.box_type === 'insurance') {
            const sqlItems = 'SELECT * FROM insurance_box_items WHERE box_id = ?';
            const items = await db.query(sqlItems, [box_id]);

            return res.render('move_out/pages/edit-insurance-box.ejs', { box, items, title: 'Edit Insurance Box' });
        }

        const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
        const contents = await db.query(sqlContent, [box_id]);

        res.render('move_out/pages/edit-box.ejs', { box, contents, title: 'Edit Box' });
    } catch (err) {
        console.error('Error fetching box details:', err);
        res.status(500).send('Error fetching box details');
    }
});



router.post('/edit-box/:box_id', upload.any(), async (req, res) => {
    const { box_id } = req.params;
    const { boxName, content_type, updated_content, updated_content_id, item_names, item_values, item_ids, new_item_names, new_item_values, delete_items } = req.body;

    try {
        const db = await getConnection();

        // Fetch box details to check the box type
        const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
        const boxes = await db.query(sqlBox, [box_id]);

        if (boxes.length === 0) {
            return res.status(404).send('Box not found');
        }

        const box = boxes[0];

        // Update the box name
        if (boxName) {
            const sqlUpdateBox = 'UPDATE boxes SET box_name = ? WHERE box_id = ?';
            await db.query(sqlUpdateBox, [boxName, box_id]);
        }

        // Handle updates based on box type
        if (box.box_type === 'insurance') {
            // Update items in the insurance_box_items table
            if (item_ids && item_names && item_values) {
                for (let i = 0; i < item_ids.length; i++) {
                    const sqlUpdateItem = 'UPDATE insurance_box_items SET item_name = ?, item_value = ? WHERE item_id = ?';
                    await db.query(sqlUpdateItem, [item_names[i], item_values[i], item_ids[i]]);
                }
            }

            // Handle deleting items if any are marked for deletion
            if (delete_items && Array.isArray(delete_items)) {
                for (const item_id of delete_items) {
                    const sqlDeleteItem = 'DELETE FROM insurance_box_items WHERE item_id = ?';
                    await db.query(sqlDeleteItem, [item_id]);
                }
            }

            // Handle adding new items to the insurance_box_items table
            if (new_item_names && new_item_values && Array.isArray(new_item_names)) {
                for (let i = 0; i < new_item_names.length; i++) {
                    if (new_item_names[i] && new_item_values[i]) {
                        const sqlInsertNewItem = 'INSERT INTO insurance_box_items (box_id, item_name, item_value) VALUES (?, ?, ?)';
                        await db.query(sqlInsertNewItem, [box_id, new_item_names[i], new_item_values[i]]);
                    }
                }
            }

            // Handle insurance logo update if provided
            const insuranceLogo = req.files.find(file => file.fieldname === 'insurance_logo');
            if (insuranceLogo) {
                const logoPath = `/insurance_logos/${insuranceLogo.filename}`;
                const sqlUpdateLogo = 'UPDATE boxes SET insurance_logo = ? WHERE box_id = ?';
                await db.query(sqlUpdateLogo, [logoPath, box_id]);
            }

        } else {
            // Handle updates for normal boxes
            // Check if existing text content is being updated
            if (updated_content && updated_content_id) {
                const sqlUpdateText = 'UPDATE contents SET content_data = ? WHERE content_id = ? AND content_type = "text"';
                await db.query(sqlUpdateText, [updated_content, updated_content_id]);
            } else if (content_type === 'text' && req.body.new_content) {
                // Handle new text content
                const textContent = req.body.new_content;
                const sqlInsertText = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
                await db.query(sqlInsertText, [box_id, 'text', textContent]);
            } else if (content_type === 'image' || content_type === 'audio') {
                // Handle new image/audio content
                if (req.files && req.files.length > 0) {
                    for (const file of req.files) {
                        const contentPath = `/uploads/${file.filename}`;
                        const sqlInsertFile = 'INSERT INTO contents (box_id, content_type, content_data) VALUES (?, ?, ?)';
                        await db.query(sqlInsertFile, [box_id, content_type, contentPath]);
                    }
                }
            }
        }

        res.redirect(`/move_out/view-box/${box_id}`);
    } catch (err) {
        console.error('Error updating box:', err);
        res.status(500).send('Error updating box');
    }
});







router.post('/delete-box/:box_id', async (req, res) => {
    const { box_id } = req.params;

    try {
        const db = await getConnection();

        
        const boxCheckSql = 'SELECT * FROM boxes WHERE box_id = ?';
        const boxResult = await db.query(boxCheckSql, [box_id]);

        if (boxResult.length === 0) {
            return res.status(404).send('Box not found');
        }

        
        const contentsSql = 'SELECT * FROM contents WHERE box_id = ?';
        const contents = await db.query(contentsSql, [box_id]);

        
        for (const content of contents) {
            if (content.content_type === 'image' || content.content_type === 'audio') {
                const filePath = path.join(__dirname, '..', 'public', content.content_data);
                console.log(`Attempting to delete content file: ${filePath}`);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    console.log(`Deleted content file: ${filePath}`);
                } else {
                    console.log(`File not found: ${filePath}`);
                }
            }
        }

        
        const qrCodePath = path.join(__dirname, '..', 'public', 'qrcodes', `${box_id}.png`);
        console.log(`Attempting to delete QR code: ${qrCodePath}`);
        if (fs.existsSync(qrCodePath)) {
            fs.unlinkSync(qrCodePath);
            console.log(`Deleted QR code: ${qrCodePath}`);
        } else {
            console.log(`QR code not found: ${qrCodePath}`);
        }

        
        const labelSql = 'SELECT label_design FROM boxes WHERE box_id = ?';
        const labelResult = await db.query(labelSql, [box_id]);

        const customLabel = labelResult[0] && labelResult[0].label_design;


        const defaultLabels = ['design1', 'design2', 'design3'];
        
        if (customLabel && !defaultLabels.includes(customLabel)) { 
            const labelPath = path.join(__dirname, '..', 'public', 'images', `${customLabel}.jpg`);
            console.log(`Attempting to delete custom label: ${labelPath}`);
            if (fs.existsSync(labelPath)) {
                fs.unlinkSync(labelPath);
                console.log(`Deleted custom label: ${labelPath}`);
            } else {
                console.log(`Custom label not found: ${labelPath}`);
            }
        }

        
        const deleteShareSql = 'DELETE FROM shared_labels WHERE box_id = ?';
        await db.query(deleteShareSql, [box_id]);

        const deleteContentsSql = 'DELETE FROM contents WHERE box_id = ?';
        await db.query(deleteContentsSql, [box_id]);

        const deleteQrCodesSql = 'DELETE FROM qr_codes WHERE box_id = ?';
        await db.query(deleteQrCodesSql, [box_id]);

        const deleteBoxSql = 'DELETE FROM boxes WHERE box_id = ?';
        await db.query(deleteBoxSql, [box_id]);

        console.log(`Box with ID ${box_id}, its files, and related QR codes deleted successfully.`);
        res.redirect('/move_out/view-boxes'); 
    } catch (err) {
        console.error('Error deleting box:', err);
        res.status(500).send('Error deleting box');
    }
});



router.post('/remove-content/:content_id', async (req, res) => {
    const { content_id } = req.params;

    try {
        const db = await getConnection();

        
        const sqlGetContent = 'SELECT box_id FROM contents WHERE content_id = ?';
        const content = await db.query(sqlGetContent, [content_id]);

        if (content.length === 0) {
            return res.status(404).send('Content not found');
        }

        const box_id = content[0].box_id;

        
        const sqlDeleteContent = 'DELETE FROM contents WHERE content_id = ?';
        await db.query(sqlDeleteContent, [content_id]);

        
        res.redirect(`/move_out/edit-box/${box_id}`);
    } catch (err) {
        console.error('Error removing content:', err);
        res.status(500).send('Error removing content');
    }
});


router.get('/profile', (req, res) => {
    const user = req.session.user;  

    if (!user) {
        return res.redirect('/move_out/login');
    }

    res.render('move_out/pages/profile.ejs', { user, title: 'Profile' });
});


router.post('/edit-profile', upload.single('profileImage'), async (req, res) => {
    const { name, email } = req.body;
    const user_id = req.session.user.user_id;

    try {
        const db = await getConnection();
        const updates = [];

        
        if (name) {
            updates.push(`name = '${name}'`);
            req.session.user.name = name; 
        }
        if (email) {
            updates.push(`email = '${email}'`);
            req.session.user.email = email; 
        }

        if (req.file) {
            const profileImagePath = `/profiles/${req.file.filename}`;
            updates.push(`profile_image = '${profileImagePath}'`);
            req.session.user.profile_image = profileImagePath; 
        }

        if (updates.length > 0) {
            const sqlUpdate = `UPDATE users SET ${updates.join(', ')} WHERE user_id = ?`;
            await db.query(sqlUpdate, [user_id]);
        }

        res.redirect('/move_out/dashboard');
    } catch (err) {
        console.error('Error updating profile:', err);
        res.status(500).send('Error updating profile');
    }
});



router.post('/deactivate-account', async (req, res) => {
    const user_id = req.session.user.user_id;
    const email = req.session.user.email;

    try {
        const db = await getConnection();

        const sqlUpdate = 'UPDATE users SET status = "inactive" WHERE user_id = ?';
        await db.query(sqlUpdate, [user_id]);

        await sendDeletionEmail(email, user_id);

        req.session.destroy();

        res.redirect('/move_out/login');
    } catch (err) {
        console.error('Error deactivating account:', err);
        res.status(500).send('Error deactivating account');
    }
});



router.get('/delete-account/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const db = await getConnection();

        const userCheckSql = 'SELECT * FROM users WHERE user_id = ?';
        const userResult = await db.query(userCheckSql, [userId]);

        if (userResult.length === 0) {
            return res.status(404).send('User not found');
        }

        const user = userResult[0];

        const profileImage = user.profile_image;
        if (profileImage && profileImage !== '/profiles/default-profile.png') {
            const profileImagePath = path.join(__dirname, '..', 'public', profileImage);
            console.log(`Attempting to delete profile picture: ${profileImagePath}`);
            if (fs.existsSync(profileImagePath)) {
                fs.unlinkSync(profileImagePath);
                console.log(`Deleted profile picture: ${profileImagePath}`);
            } else {
                console.log(`Profile picture not found: ${profileImagePath}`);
            }
        }

        const boxesSql = 'SELECT * FROM boxes WHERE user_id = ?';
        const boxes = await db.query(boxesSql, [userId]);
        // Fixing box_id to boxId
        for (const box of boxes) {
            const boxId = box.box_id;

            const qrCodeSql = 'SELECT qr_code_data FROM qr_codes WHERE box_id = ?';
            const qrCodes = await db.query(qrCodeSql, [boxId]);

            for (const qrCode of qrCodes) {
                const qrCodePath = path.join(__dirname, '..', 'public', qrCode.qr_code_data);
                if (fs.existsSync(qrCodePath)) {
                    fs.unlinkSync(qrCodePath);
                    console.log(`Deleted QR code: ${qrCodePath}`);
                }
            }

            const customLabel = box.label_design;
            if (customLabel && customLabel !== 'default') {
                const labelPath = path.join(__dirname, '..', 'public', 'images', `${customLabel}.jpg`);
                if (fs.existsSync(labelPath)) {
                    fs.unlinkSync(labelPath);
                    console.log(`Deleted custom label: ${labelPath}`);
                }
            }

            const contentsSql = 'SELECT * FROM contents WHERE box_id = ?';
            const contents = await db.query(contentsSql, [boxId]);

            for (const content of contents) {
                if (content.content_type === 'image' || content.content_type === 'audio') {
                    const contentFilePath = path.join(__dirname, '..', 'public', content.content_data);
                    if (fs.existsSync(contentFilePath)) {
                        fs.unlinkSync(contentFilePath);
                        console.log(`Deleted uploaded content: ${contentFilePath}`);
                    }
                }
            }

            const deleteShareSql = 'DELETE FROM shared_labels WHERE box_id = ?';
            await db.query(deleteShareSql, [boxId]);

            const deleteContentsSql = 'DELETE FROM contents WHERE box_id = ?';
            await db.query(deleteContentsSql, [boxId]);

            const deleteQrCodesSql = 'DELETE FROM qr_codes WHERE box_id = ?';
            await db.query(deleteQrCodesSql, [boxId]);

            const deleteBoxSql = 'DELETE FROM boxes WHERE box_id = ?';
            await db.query(deleteBoxSql, [boxId]);

            console.log(`Box with ID ${boxId} and its files deleted successfully.`);
        }

        const deleteUserSql = 'DELETE FROM users WHERE user_id = ?';
        await db.query(deleteUserSql, [userId]);    
        console.log('Deleting user with ID:', userId);

        let data = {
            title: 'Account Deleted',
            message: 'Your account and all associated data have been successfully deleted.'
        };
        res.render('move_out/pages/delete-confirmation.ejs', data);
    } catch (error) {
        console.error('Error deleting user:', error); 
        res.status(500).send('Internal Server Error');
    }
});


router.post('/share-label/:box_id', async (req, res) => {
    const { box_id } = req.params;
    const { email } = req.body;
    const shared_by_user_id = req.session.user.user_id; 

    try {
        const db = await getConnection();

        const shareSql = 'INSERT INTO shared_labels (box_id, shared_with_email, shared_by_user_id) VALUES (?, ?, ?)';
        await db.query(shareSql, [box_id, email, shared_by_user_id]);

        await sendShareNotificationEmail(email, box_id);

        res.redirect(`/move_out/view-box/${box_id}`);
    } catch (err) {
        console.error('Error sharing label:', err);
        res.status(500).send('Error sharing label');
    }
});


router.post('/access-private-box/:box_id', async (req, res) => {
    const { box_id } = req.params;
    const { pin } = req.body;

    try {
        const db = await getConnection();

        
        const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
        const boxes = await db.query(sqlBox, [box_id]);

        if (boxes.length === 0) {
            return res.status(404).send('Box not found');
        }

        const box = boxes[0];

        if (box.privacy === 'private' && box.pin !== pin) {
            return res.status(401).send('Invalid PIN. Please try again.');
        }

        const sqlContent = 'SELECT * FROM contents WHERE box_id = ?';
        const contents = await db.query(sqlContent, [box_id]);

        res.render('move_out/pages/box-details.ejs', { box, contents, qrCode: null, user: req.session.user, title: 'Box Details' });
    } catch (err) {
        console.error('Error accessing private box:', err);
        res.status(500).send('Error accessing private box');
    }
});


router.post('/verify-pin/:box_id', async (req, res) => {
    const { box_id } = req.params;
    const { pin } = req.body;

    try {
        const db = await getConnection();

        const sqlBox = 'SELECT * FROM boxes WHERE box_id = ?';
        const boxes = await db.query(sqlBox, [box_id]);

        if (boxes.length === 0) {
            return res.status(404).send('Box not found');
        }

        const box = boxes[0];

        if (box.pin !== pin) {
            return res.render('move_out/pages/enter_pin.ejs', { box_id, title: 'Enter PIN', error: 'Incorrect PIN. Please try again.' });
        }

        req.session.validPinForBox = box_id;

        res.redirect(`/move_out/view-box/${box_id}`);
    } catch (err) {
        console.error('Error verifying PIN:', err);
        res.status(500).send('Error verifying PIN');
    }
});



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


router.get('/shared-labels', async (req, res) => {
    const userEmail = req.session.user.email; 

    try {
        const sharedBoxes = await getSharedLabelsByEmail(userEmail); 
        if (sharedBoxes.length === 0) {
            return res.render('move_out/pages/no_shared_boxes.ejs', { title: 'No Shared Boxes' });
        }
        res.render('move_out/pages/shared_boxes.ejs', { sharedBoxes, title: 'Shared Boxes' });
    } catch (error) {
        console.error('Error fetching shared boxes:', error);
        res.status(500).send('Error fetching shared boxes.');
    }
});


router.get('/admin', async (req, res) => {
        res.redirect('/move_out/admin/dashboard'); 
});


router.get('/admin/dashboard', async (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) {
        res.redirect('/move_out/login'); 
        
    }

    try {
        const users = await getAllUsers(); 
        res.render('move_out/admin/dashboard.ejs', { users, title: 'Admin Dashboard' });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).send('Internal Server Error');
    }
});


router.get('/admin/send-marketing-email', (req, res) => {
    if (!req.session.user || !req.session.user.is_admin) {
        return res.redirect('/move_out/login');
    }

    res.render('move_out/admin/send-marketing-email.ejs', { title: 'Send Marketing Email' });
});



router.post('/admin/send-marketing-email', async (req, res) => {
    const { subject, content } = req.body;

    try {
        const result = await sendMarketingEmail(subject, content);

        if (result.success) {
            console.log('Marketing email sent successfully to all active users.');
            res.redirect('/move_out/admin/dashboard');
        } else {
            console.error('Error sending marketing email:', result.error);
            res.status(500).send('Error sending marketing email.');
        }
    } catch (error) {
        console.error('Error sending marketing email:', error);
        res.status(500).send('Error sending marketing email.');
    }
});



router.post('/admin/activate-deactivate/:userId', async (req, res) => {
    const { userId } = req.params;
    console.log(`Request received for user ${req.params.userId}`);
    
    try {
        const result = await toggleUserStatus(userId);
        if (result.success) {
            res.redirect('/move_out/admin/dashboard'); 
        }
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).send('Error updating user status');
    }
});



module.exports = router;
