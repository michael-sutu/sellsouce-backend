# Online Code Marketplace Backend

This project is an Express.js-based backend API for an online marketplace that lets people buy and sell code. The API provides various functionalities for user management, file operations, referral code management, and email communications.

## Features

- **User Management**: Provides endpoints for user signup, login, profile management, and account deletion.
- **File Operations**: Supports uploading, downloading, and managing files associated with users.
- **Referral Code Management**: Allows users to create and manage referral codes, track their usage, and earnings.
- **Email Functionality**: Integrates with Gmail to send verification, welcome, and other transactional emails.
- **Validation**: Includes functions to validate emails, phone numbers, and images.

## Installation

To run this project, you'll need Node.js installed along with the following dependencies:

- `express`: A minimal and flexible Node.js web application framework.
- `bcrypt`: A library to help hash passwords.
- `multer`: A middleware for handling `multipart/form-data`, primarily for file uploads.
- `mongodb`: MongoDB driver for Node.js.
- `cors`: A package to enable Cross-Origin Resource Sharing.
- `nodemailer`: A module for Node.js applications to allow email sending.
- `archiver`: A library for creating archives.

You can install these dependencies using npm:

```bash
npm install express bcrypt multer mongodb cors nodemailer archiver
