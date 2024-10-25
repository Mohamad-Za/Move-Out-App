DROP TABLE IF EXISTS qr_codes;
DROP TABLE IF EXISTS contents;
DROP TABLE IF EXISTS insurance_box_items;
DROP TABLE IF EXISTS shared_boxes;
DROP TABLE IF EXISTS boxes;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS unverified_users;  


CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NULL,
    is_verified BOOLEAN DEFAULT 1,  
    status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_admin TINYINT DEFAULT 0,
    storage_usage BIGINT DEFAULT 0,
    profile_image VARCHAR(255) DEFAULT '/profiles/default-profile.png'
);

CREATE TABLE unverified_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    verification_code VARCHAR(8) NOT NULL,  
    token_expiration BIGINT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE boxes (
    box_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    box_name VARCHAR(255) NOT NULL,
    label_design VARCHAR(255),  
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    privacy ENUM('public', 'private') DEFAULT 'public',
    pin VARCHAR(6),
    box_type ENUM('normal', 'insurance') DEFAULT 'normal',
    insurance_logo VARCHAR(255) DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE 
);

CREATE TABLE contents (
    content_id INT AUTO_INCREMENT PRIMARY KEY,
    box_id INT,
    content_type ENUM('text', 'audio', 'image') NOT NULL,
    content_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    size BIGINT DEFAULT 0,
    FOREIGN KEY (box_id) REFERENCES boxes(box_id) ON DELETE CASCADE  
);

CREATE TABLE qr_codes (
    qr_id INT AUTO_INCREMENT PRIMARY KEY,
    box_id INT,
    qr_code_data TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (box_id) REFERENCES boxes(box_id) ON DELETE CASCADE  
);


CREATE TABLE shared_labels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    box_id INT NOT NULL,
    shared_with_email VARCHAR(255) NOT NULL,
    shared_by_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (box_id) REFERENCES boxes(box_id),
    FOREIGN KEY (shared_by_user_id) REFERENCES users(user_id)
);


CREATE TABLE insurance_box_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    box_id INT,
    item_name VARCHAR(255) NOT NULL,
    item_value DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SEK',
    insurance_logo VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (box_id) REFERENCES boxes(box_id) ON DELETE CASCADE
);

