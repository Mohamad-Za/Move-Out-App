const config = require("../config/db/move_out.json");
const mysql = require("promise-mysql");
const bcrypt = require('bcryptjs');
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

        const verificationCode = (Math.floor(10000000 + Math.random() * 90000000)).toString(); 
        const tokenExpiration = Date.now() + 3600000; 

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

async function sendVerificationEmail(email, verificationCode) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.gmailUser,
            pass: config.appPass
        }
    });

    const mailOptions = {
        from: config.gmailUser,
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
            user: config.gmailUser,
            pass: config.appPass
        }
    });

    const deletionLink = `http://localhost:3000/move_out/delete-account/${userId}`;

    const mailOptions = {
        from: config.gmailUser,
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


async function sendShareNotificationEmail(email, box_id) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: config.gmailUser,
            pass: config.appPass 
        }
    });

    const mailOptions = {
        from: config.gmailUser,
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
            user: config.gmailUser,
            pass: config.appPass 
        }
    });

    const mailOptions = {
        from: config.gmailUser,
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
        const sql = 'SELECT * FROM users WHERE is_admin = 0';
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
            user: config.gmailUser,
            pass: config.appPass 
        }
    });

    const mailOptions = {
        from: config.gmailUser,
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
            WHERE last_activity < NOW() - INTERVAL 23 DAY 
            AND last_activity > NOW() - INTERVAL 30 DAY
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
    clientID: config.googleClientID,
    clientSecret: config.googleClientSecret,
    callbackURL: config.googleCallbackURL
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
    done(null, user.user_id); 
});


passport.deserializeUser(async (id, done) => {
    const db = await getConnection();
    const user = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);

    if (user.length > 0) {
        done(null, user[0]); 
    } else {
        done(new Error('User not found')); 
    }
});


async function sendMarketingEmail(subject, content) {
    try {
        const db = await mysql.createConnection(config);

        const sqlUsers = 'SELECT email FROM users WHERE status = "active" AND is_admin = 0';
        const users = await db.query(sqlUsers);

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: config.gmailUser,
                pass: config.appPass
            }
        });

        const mailOptions = {
            from: config.gmailUser,
            subject: subject,
            html: content
        };

        for (const user of users) {
            mailOptions.to = user.email;
            await transporter.sendMail(mailOptions);
        }

        return { success: true };
    } catch (error) {
        console.error('Error in sendMarketingEmail:', error);
        return { success: false, error };
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
    getSharedLabelsByEmail,
    updateLastActivity,
    sendReminderEmails,
    deactivateInactiveUsers,
    passport,
    sendMarketingEmail,
    toggleUserStatus,
};
