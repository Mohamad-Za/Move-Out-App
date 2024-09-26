// "use strict";
const config = require("../config/db/move_out.json");
const mysql = require("promise-mysql");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');


// Function to create a connection to the database
async function getConnection() {
    return mysql.createConnection(config);
}

// Function to register a user (store in unverified_users)
async function createUser(email, password, name) {
    const db = await getConnection();
    try {
        // Check if the user is already registered
        const userExists = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userExists.length > 0) {
            throw new Error('User already exists with this email!');
        }

        // Check if the user is already in unverified_users
        const unverifiedExists = await db.query('SELECT * FROM unverified_users WHERE email = ?', [email]);
        if (unverifiedExists.length > 0) {
            throw new Error('User already registered but not verified. Please check your email.');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate an 8-digit verification code
        const verificationCode = (Math.floor(10000000 + Math.random() * 90000000)).toString(); // 8-digit code as string
        const tokenExpiration = Date.now() + 3600000; // 1 hour expiration

        // Insert into unverified_users table
        const sql = 'INSERT INTO unverified_users (email, password, verification_code, token_expiration, name) VALUES (?, ?, ?, ?, ?)';
        const result = await db.query(sql, [email, hashedPassword, verificationCode, tokenExpiration, name]);

        return { userId: result.insertId, verificationCode }; // Return the verification code
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    } finally {
        await db.end();
    }
}





// user: 'mohammad.zahedi230@gmail.com',
// pass: 'wodu puji kbuf mqvx' // Your app-specific password
// }
// });

// const mailOptions = {
// from: 'mohammad.zahedi230@gmail.com',
// to: email,



async function sendVerificationEmail(email, verificationCode) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohammad.zahedi230@gmail.com',
            pass: 'wodu puji kbuf mqvx' // Your app-specific password
        }
    });

    const mailOptions = {
        from: 'mohammad.zahedi230@gmail.com',
        to: email,
        subject: 'Email Verification',
        html: `<p>Your verification code is: <strong>${verificationCode}</strong></p>
               <p>Please enter this code on the verification page to verify your email.</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Verification email sent to', email);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
}




// // Function to verify the user's token
// async function verifyUserToken(verificationToken) {
//     const db = await getConnection();
//     try {
//         // Find the user in unverified_users by token
//         const sql = 'SELECT * FROM unverified_users WHERE verification_token = ? AND token_expiration > ?';
//         const result = await db.query(sql, [verificationToken, Date.now()]);

//         if (result.length === 0) {
//             return { success: false, message: 'Invalid or expired verification token.' };
//         }

//         const user = result[0];

//         // Move the user to the users table (including name)
//         const insertSql = 'INSERT INTO users (name, email, password, is_verified) VALUES (?, ?, ?, 1)';
//         await db.query(insertSql, [user.name, user.email, user.password]);

//         // Delete the user from unverified_users
//         const deleteSql = 'DELETE FROM unverified_users WHERE id = ?';
//         await db.query(deleteSql, [user.id]);

//         return { success: true, message: 'Email successfully verified! You can now log in.' };
//     } catch (err) {
//         console.error('Error verifying user:', err);
//         throw err;
//     } finally {
//         await db.end();
//     }
// }

// Function to verify the user's 8-digit code
async function verifyUserCode(verificationCode) {
    const db = await getConnection();
    try {
        // Find the user in unverified_users by verification code
        const sql = 'SELECT * FROM unverified_users WHERE verification_code = ? AND token_expiration > ?';
        const result = await db.query(sql, [verificationCode, Date.now()]);

        if (result.length === 0) {
            return { success: false, message: 'Invalid or expired verification code.' };
        }

        const user = result[0];

        // Move the user to the users table (without verification_code and token_expiration)
        const insertSql = 'INSERT INTO users (email, password, is_verified, name) VALUES (?, ?, 1, ?)';
        await db.query(insertSql, [user.email, user.password, user.name]);

        // Delete the user from unverified_users
        const deleteSql = 'DELETE FROM unverified_users WHERE id = ?';
        await db.query(deleteSql, [user.id]);

        return { success: true, message: 'Email successfully verified! You can now log in.' };
    } catch (err) {
        console.error('Error verifying user:', err);
        throw err;
    } finally {
        await db.end();
    }
}



// Function to authenticate a user during login
async function authenticateUser(email, password) {
    const db = await getConnection();
    try {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const users = await db.query(sql, [email]);

        if (users.length === 0) {
            return { success: false, message: '' };
        }

        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return { success: false, message: '' };
        }

        // Return user details including nam
        return { success: true, user };
    } catch (err) {
        console.error('Error authenticating user:', err);
        throw err;
    } finally {
        await db.end();
    }
}



async function createBox(userId, boxName, description, labelDesign) {
    const db = await getConnection();
    const sql = 'INSERT INTO boxes (user_id, box_name, description, label_design) VALUES (?, ?, ?, ?)';
    const result = await db.query(sql, [userId, boxName, description, labelDesign]);
    return result.insertId;
}




module.exports = {
    getConnection,
    createUser,
    sendVerificationEmail,
    authenticateUser,
    // verifyUserToken,
    createBox,
    verifyUserCode
};