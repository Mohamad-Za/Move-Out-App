const config = require("../config/db/move_out.json");
const mysql = require("promise-mysql");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;


async function getConnection() {
    return mysql.createConnection(config);
}

async function createUser(email, password, name) {
    const db = await getConnection();
    try {
        const userExists = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (userExists.length > 0) {
            throw new Error('User already exists with this email!');
        }

        const unverifiedExists = await db.query('SELECT * FROM unverified_users WHERE email = ?', [email]);
        if (unverifiedExists.length > 0) {
            throw new Error('User already registered but not verified. Please check your email.');
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const verificationCode = (Math.floor(10000000 + Math.random() * 90000000)).toString(); // 8-digit code as string
        const tokenExpiration = Date.now() + 3600000; // 1 hour expiration

        const sql = 'INSERT INTO unverified_users (email, password, verification_code, token_expiration, name) VALUES (?, ?, ?, ?, ?)';
        const result = await db.query(sql, [email, hashedPassword, verificationCode, tokenExpiration, name]);

        return { userId: result.insertId, verificationCode }; 
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
            pass: 'wodu puji kbuf mqvx' 
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

async function verifyUserCode(verificationCode) {
    const db = await getConnection();
    try {
        const sql = 'SELECT * FROM unverified_users WHERE verification_code = ? AND token_expiration > ?';
        const result = await db.query(sql, [verificationCode, Date.now()]);

        if (result.length === 0) {
            return { success: false, message: 'Invalid or expired verification code.' };
        }

        const user = result[0];

        const insertSql = 'INSERT INTO users (email, password, is_verified, name) VALUES (?, ?, 1, ?)';
        await db.query(insertSql, [user.email, user.password, user.name]);

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



async function authenticateUser(email, password) {
    const db = await getConnection();
    try {
        const sql = 'SELECT * FROM users WHERE email = ?';
        const users = await db.query(sql, [email]);

        if (users.length === 0) {
            return { success: false, reason: 'not_found' };
        }

        const user = users[0];

        if (user.status === 'inactive') {
            return { success: false, reason: 'deactivated' };
        }

        if (user.password === null) {
            await updateLastActivity(user.user_id); 
            return { success: true, user };
        }

        const validPassword = await bcrypt.compare(password, user.password);

        if (!validPassword) {
            return { success: false, reason: 'invalid_password' };
        }

        await updateLastActivity(user.user_id); 
        return { success: true, user };
    } catch (err) {
        console.error('Error authenticating user:', err);
        throw err;
    } finally {
        await db.end();
    }
}





async function sendDeletionEmail(email, userId) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohammad.zahedi230@gmail.com',
            pass: 'wodu puji kbuf mqvx' 
        }
    });

    const deletionLink = `http://localhost:3000/move_out/delete-account/${userId}`;

    const mailOptions = {
        from: 'mohammad.zahedi230@gmail.com',
        to: email,
        subject: 'Confirm Account Deletion',
        html: `
        <p>You have deactivated your account. If you want to permanently delete it, click the link below:</p>
        <a href="http://localhost:3000/move_out/delete-account/${userId}">Delete Account</a>
    `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Deactivation email sent to', email);
    } catch (error) {
        console.error('Error sending deactivation email:', error);
        throw error;
    }
}




// // Function to share a label with another user via email
// async function shareLabelWithEmail(box_id, shared_with_email, shared_by_user_id) {
//     const db = await getConnection();
//     try {
//         // Check if the email belongs to a registered user
//         const userExists = await db.query('SELECT * FROM users WHERE email = ?', [shared_with_email]);

//         if (userExists.length === 0) {
//             throw new Error('User with this email does not exist.');
//         }

//         // Insert into shared_labels table
//         const sql = 'INSERT INTO shared_labels (box_id, shared_with_email, shared_by_user_id) VALUES (?, ?, ?)';
//         await db.query(sql, [box_id, shared_with_email, shared_by_user_id]);

//         return { success: true, message: 'Label shared successfully!' };
//     } catch (err) {
//         console.error('Error sharing label:', err);
//         return { success: false, message: err.message };
//     } finally {
//         await db.end();
//     }
// }



async function sendShareNotificationEmail(email, box_id) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohammad.zahedi230@gmail.com',
            pass: 'wodu puji kbuf mqvx' 
        }
    });

    const mailOptions = {
        from: 'mohammad.zahedi230@gmail.com',
        to: email,
        subject: 'A Label has been Shared with You',
        text: `A label has been shared with you. Click the link below to view it: 
               http://localhost:3000/move_out/view-box/${box_id}`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Share notification email sent to', email);
    } catch (error) {
        console.error('Error sending share notification email:', error);
    }
}


async function sendPinEmail(email, pin) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohammad.zahedi230@gmail.com',
            pass: 'wodu puji kbuf mqvx' 
        }
    });

    const mailOptions = {
        from: 'mohammad.zahedi230@gmail.com',
        to: email,
        subject: 'Your Box PIN',
        html: `<p>Your private box is protected by a 6-digit PIN. The PIN is: <strong>${pin}</strong></p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('PIN email sent to:', email);
    } catch (error) {
        console.error('Error sending PIN email:', error);
        throw error;
    }
}



async function getAllUsers() {
    const db = await getConnection();
    try {
        const sql = 'SELECT * FROM users';
        const users = await db.query(sql);

        for (let user of users) {
            user.storageUsage = await calculateStorageUsage(user.user_id);
        }

        return users;
    } catch (error) {
        console.error('Error fetching users:', error);
        throw error;
    } finally {
        await db.end();
    }
}





async function getPublicBoxesByUser(userId) {
    const db = await getConnection();
    try {
        const sql = 'SELECT * FROM boxes WHERE user_id = ? AND privacy = "public"'; // Public boxes only
        const boxes = await db.query(sql, [userId]);
        return boxes;
    } catch (error) {
        throw error;
    } finally {
        await db.end();
    }
}



async function getSharedLabelsByEmail(email) {
    const db = await getConnection();
    try {
        const sql = `
            SELECT boxes.*, shared_labels.shared_with_email
            FROM boxes
            INNER JOIN shared_labels ON boxes.box_id = shared_labels.box_id
            WHERE shared_labels.shared_with_email = ?
        `;
        const sharedBoxes = await db.query(sql, [email]);
        return sharedBoxes;
    } catch (error) {
        throw error;
    } finally {
        await db.end();
    }
}



async function updateLastActivity(userId) {
    const db = await getConnection();
    try {
        const sql = 'UPDATE users SET last_activity = CURRENT_TIMESTAMP WHERE user_id = ?';
        await db.query(sql, [userId]);
    } catch (err) {
        console.error('Error updating last activity:', err);
        throw err;
    } finally {
        await db.end();
    }
}

async function deactivateInactiveUsers() {
    const db = await getConnection();
    try {
        const sql = `
            UPDATE users 
            SET status = 'inactive' 
            WHERE last_activity < NOW() - INTERVAL 30 DAY 
            AND status = 'active'
        `;
        await db.query(sql);
        console.log('Inactive users deactivated successfully.');
    } catch (err) {
        console.error('Error deactivating inactive users:', err);
        throw err;
    } finally {
        await db.end();
    }
}

async function sendReminderEmail(email) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohammad.zahedi230@gmail.com',
            pass: 'wodu puji kbuf mqvx' 
        }
    });

    const mailOptions = {
        from: 'mohammad.zahedi230@gmail.com',
        to: email,
        subject: 'Account Inactivity Warning',
        html: `<p>Your account has been inactive for almost a month. If you do not log in within the next 7 days, your account will be deactivated.</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Reminder email sent to:', email);
    } catch (error) {
        console.error('Error sending reminder email:', error);
        throw error;
    }
}

async function sendReminderEmails() {
    const db = await getConnection();
    try {
        const sql = `
            SELECT email, user_id
            FROM users
            WHERE last_activity < NOW() - INTERVAL 1 DAY
            AND status = 'active'
        `;
        const users = await db.query(sql);

        for (const user of users) {
            await sendReminderEmail(user.email); 
        }

        console.log('Reminder emails sent to inactive users.');
    } catch (err) {
        console.error('Error sending reminder emails:', err);
        throw err;
    } finally {
        await db.end();
    }
}



passport.use(new GoogleStrategy({
    clientID: '734043261353-i60gf4pghmmvivs7pe31e6cvdl9gllck.apps.googleusercontent.com',
    clientSecret: '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',
    callbackURL: 'http://localhost:3000/move_out/auth/google/callback' 
    },
    async (accessToken, refreshToken, profile, done) => {
        try {
            const db = await getConnection();
            const existingUser = await db.query('SELECT * FROM users WHERE email = ?', [profile.emails[0].value]);

            if (existingUser.length > 0) {
                const user = existingUser[0];
                
                if (user.status === 'inactive') {
                    return done(null, false, { message: 'deactivated' }); 
                }

                return done(null, user);
            } else {
                const newUserSql = 'INSERT INTO users (name, email, is_verified, is_admin) VALUES (?, ?, 1, 0)';
                const result = await db.query(newUserSql, [profile.displayName, profile.emails[0].value]);

                const newUser = {
                    user_id: result.insertId,
                    name: profile.displayName,
                    email: profile.emails[0].value,
                    is_verified: 1,
                    status: 'active'
                };

                return done(null, newUser);
            }
        } catch (err) {
            return done(err);
        }
    }
));



passport.serializeUser((user, done) => {
    // console.log('Serializing user:', user); 
    done(null, user.user_id); 
});



passport.deserializeUser(async (id, done) => {
    const db = await getConnection();
    const user = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);

    if (user.length > 0) {
        // console.log('Deserializing user:', user[0]); 
        done(null, user[0]); 
    } else {
        done(new Error('User not found')); 
    }
});







async function sendMarketingEmail(email) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'mohammad.zahedi230@gmail.com',
            pass: 'wodu puji kbuf mqvx'
        }
    });

    const mailOptions = {
        from: 'mohammad.zahedi230@gmail.com',
        to: email,
        subject: 'Exciting Updates from Move Out',
        html: `<p>We have some exciting updates for you! Check them out at our website.</p>`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('Marketing email sent to:', email);
    } catch (error) {
        console.error('Error sending marketing email:', error);
        throw error;
    }
}




async function toggleUserStatus(userId) {
    const db = await getConnection();
    try {
        const currentStatus = await db.query('SELECT status FROM users WHERE user_id = ?', [userId]);

        if (currentStatus.length === 0) {
            throw new Error('User not found');
        }

        const newStatus = currentStatus[0].status === 'active' ? 'inactive' : 'active';

        await db.query('UPDATE users SET status = ? WHERE user_id = ?', [newStatus, userId]);
        return { success: true, newStatus };
    } catch (error) {
        console.error('Error toggling user status:', error);
        throw error;
    } finally {
        await db.end();
    }
}






// // Function to get storage usage for each user
// async function getStorageUsage() {
//     const db = await getConnection();
//     try {
//         // Query to get user storage usage
//         const sql = `
//             SELECT users.user_id, users.name, users.email, 
//                    IFNULL(SUM(CHAR_LENGTH(contents.content_data)), 0) AS total_storage_usage
//             FROM users
//             LEFT JOIN boxes ON users.user_id = boxes.user_id
//             LEFT JOIN contents ON boxes.box_id = contents.box_id
//             GROUP BY users.user_id
//         `;
//         const results = await db.query(sql);
//         return results;
//     } catch (error) {
//         console.error('Error fetching storage usage:', error);
//         throw error;
//     } finally {
//         await db.end();
//     }
// }


async function calculateStorageUsage(userId) {
    const db = await getConnection();
    try {
        const sql = `
            SELECT SUM(size) AS total_size
            FROM contents
            WHERE box_id IN (SELECT box_id FROM boxes WHERE user_id = ?)
        `;
        const result = await db.query(sql, [userId]);
        const totalSize = result[0].total_size || 0; 

        return totalSize;
    } catch (error) {
        console.error('Error calculating storage usage:', error);
        throw error;
    } finally {
        await db.end();
    }
}





module.exports = {
    getConnection,
    createUser,
    sendVerificationEmail,
    authenticateUser,
    verifyUserCode,
    sendDeletionEmail,
    sendShareNotificationEmail,
    sendPinEmail,
    getAllUsers,
    getPublicBoxesByUser,
    getSharedLabelsByEmail,
    updateLastActivity,
    sendReminderEmails,
    deactivateInactiveUsers,
    passport,
    sendMarketingEmail,
    toggleUserStatus,
};
