// generate a hashed password for Admin here
// Create/add an admin in 'sql\move_out\insert.sql'

const bcrypt = require('bcryptjs');

async function generateHashedPassword() {
    const password = 'Admin123'; 
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    console.log(hashedPassword); 
}

generateHashedPassword();
