-- Drop existing tables if they exist
DROP TABLE IF EXISTS qr_codes;
DROP TABLE IF EXISTS contents;
DROP TABLE IF EXISTS boxes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS unverified_users;  -- Drop the unverified_users table if it exists

-- Create the users table (only for verified users)
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    is_verified BOOLEAN DEFAULT 1,  -- Verified users only
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the unverified_users table
CREATE TABLE unverified_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    verification_code VARCHAR(8) NOT NULL,  -- 8-digit verification code
    token_expiration BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create the boxes table (for storing boxes related to users)
CREATE TABLE boxes (
    box_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    box_name VARCHAR(255) NOT NULL,
    description TEXT,
    label_design VARCHAR(255),  -- To store the selected label design
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id)  -- Reference to verified users
);


-- Create the contents table (for storing the contents inside boxes)
CREATE TABLE contents (
    content_id INT AUTO_INCREMENT PRIMARY KEY,
    box_id INT,
    content_type ENUM('text', 'audio', 'image') NOT NULL,
    content_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (box_id) REFERENCES boxes(box_id)
);

-- Create the qr_codes table (for storing QR codes related to boxes)
CREATE TABLE qr_codes (
    qr_id INT AUTO_INCREMENT PRIMARY KEY,
    box_id INT,
    qr_code_data TEXT NOT NULL,  -- This will store the QR code image path
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (box_id) REFERENCES boxes(box_id)
);

