# MoveOut Project - README

Welcome to the MoveOut project! This README file will guide you through everything you need to set up and run the application, even if you are not a developer. Please follow the instructions carefully to ensure everything works smoothly.
![MoveOut Project Overview](public\flow_chart\user_flowchart.png)

## Table of Contents
1. [Project Overview](#project-overview)
2. [Requirements](#requirements)
3. [Installation Guide](#installation-guide)
4. [Setting Up MariaDB](#setting-up-mariadb)
5. [Running the Application](#running-the-application)
6. [Troubleshooting](#troubleshooting)
7. [Licence](#Licence)

## Project Overview
MoveOut is an application designed to help users organize and label their moving boxes. The app allows users to create labels, add box content in text, images, or audio, and generate QR codes to access this information easily. It also provides features such as Gmail registration, account management, sharing labels, and a secure admin dashboard.

## Requirements
Before setting up the MoveOut project, you need to ensure you have the following tools and software installed:

1. **Node.js** (v14.0.0 or later): Required to run the backend server.
2. **npm** (Node Package Manager): Usually comes with Node.js and is used to install the dependencies.
3. **MariaDB**: Used as the database for storing user and box information.
4. **Git**: To clone the project repository.

## Installation Guide
### Step 1: Install Node.js and npm
To install Node.js and npm:
- Visit the [Node.js official website](https://nodejs.org/).
- Download the latest stable version for your operating system.
- Follow the installer instructions.
- After installation, check if Node.js and npm are installed by running the following commands in your terminal (Command Prompt or PowerShell for Windows):
  ```bash
  node -v
  npm -v
  ```
  You should see the version numbers displayed.

### Step 2: Install Git
- Visit the [Git official website](https://git-scm.com/).
- Download and install Git following the setup wizard.

### Step 3: Clone the Project Repository
To clone the repository, open your terminal and run:
```bash
git clone https://github.com/Mohamad-Za/Move-Out-App.git
```

### Step 4: Install MariaDB
MariaDB is used to manage the project database. Follow the instructions below to install MariaDB on your system.

- **Windows**:
  1. Visit the [MariaDB downloads page](https://mariadb.org/download/).
  2. Choose the appropriate version for Windows and download the installer.
  3. Run the installer and follow the instructions. Make sure to:
     - Set a root password (remember this, as it will be needed later).
     - Use the default settings during installation.

- **macOS**:
  1. Open Terminal.
  2. Run the following command to install MariaDB via Homebrew:
     ```bash
     brew install mariadb
     ```
  3. Start the MariaDB service:
     ```bash
     brew services start mariadb
     ```

- **Linux** (Debian/Ubuntu-based):
  1. Open Terminal.
  2. Run the following commands:
     ```bash
     sudo apt update
     sudo apt install mariadb-server
     ```
  3. Start MariaDB:
     ```bash
     sudo systemctl start mariadb
     ```

### Step 5: Set Up the Database
1. Open your terminal and log in to MariaDB by running:
   ```bash
   mysql -u root -p
   ```
   You will be prompted to enter the root password you set during installation.

2. Navigate to the `sql/move_out/` directory in your terminal:
   ```bash
   cd sql/move_out/
   ```

3. Run the following command to create the necessary database structure:
   ```bash
   mariadb < reset.sql
   ```

4. Exit MariaDB:
   ```bash
   EXIT;
   ```

## Running the Application
### Step 1: Install Dependencies
Navigate to the project folder in your terminal:
```bash
cd Move-Out-App
```
Then, install all required dependencies by running:
```bash
npm install
```
This will install everything needed for the application, including:
- **bcryptjs**: For password hashing
- **body-parser**: To handle form data
- **ejs**: For rendering dynamic HTML pages
- **express**: To set up the server
- **express-session**: For managing user sessions
- **kill-port**: To stop any process using a specific port
- **multer**: For handling file uploads
- **mysql** and **promise-mysql**: To connect and interact with MariaDB
- **node-cron**: For scheduled tasks
- **nodemailer**: To send emails (e.g., for account verification)
- **passport** and **passport-google-oauth20**: For user authentication
- **qrcode**: To generate QR codes
- **readline-promise**: For creating interactive command line prompts

In addition, there are some development dependencies:
- **eslint**: For code linting to maintain code quality

After running `npm install`, all these dependencies will be installed and ready to use.

### Step 2: Set Up Environment Variables
Edit the `config/db/move_out.json` file to add the following information:
```
{
    "host": "localhost",
    "user": "your username",
    "password": "your password",
    "database": "moveout_app",
    "multipleStatements": true,
    "connectionLimit": 10,
    "waitForConnections": true,
    "queueLimit": 0,
    "gmailUser": "your_gmail_address_here", // For Nodemailer to send emails
    "gmailPass": "your_gmail_app_password_here", // For Nodemailer to send emails
    "googleClientID": "your_google_client_id_here", // For Google registration
    "googleClientSecret": "your_google_client_secret_here", // For Google registration
    "googleCallbackURL": "http://localhost:3000/move_out/auth/google/callback" // For Google registration
}

Gmail Credentials (For Nodemailer to send emails):
    gmailUser: Your Gmail address.
    gmailPass: Your Gmail app password.

Google OAuth Credentials (For Google registration):
    googleClientID: Your Google client ID.
    googleClientSecret: Your Google client secret.
    googleCallbackURL: The callback URL used for Google OAuth.
```



### Step 3: Start the Application
To start the application, navigate to the project directory and run:
```bash
node app.js
```
The application will be running on `http://localhost:3000/move_out`. You can open this address in your web browser to use the MoveOut app.

## Troubleshooting
- **MariaDB Connection Issues**: If you have trouble connecting to MariaDB, make sure that the service is running. You can check the status by running:
  - Windows: Search for `Services` and ensure MariaDB is running.
  - Linux/macOS: Run `sudo systemctl status mariadb`.

- **Port in Use**: If you get an error saying port 3000 is already in use, you can either stop the process using that port or change the port in the `app.js` file.

- **Gmail Authentication Error**: If sending emails fails, ensure that your Gmail account allows less secure apps or set up an app password in your Google account settings.

## LICENCE
https://github.com/Mohamad-Za/Move-Out-App/blob/master/LICENSE