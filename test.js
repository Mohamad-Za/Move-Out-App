const bcrypt = require('bcryptjs');

async function generateHashedPassword() {
    const password = 'Admin123'; // Change this to your desired password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(hashedPassword); // Use this hashed password in the SQL statement
}

// Call the function to generate the hashed password
generateHashedPassword().catch(err => console.error(err));
