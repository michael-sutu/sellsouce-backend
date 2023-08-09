# sellsource

An online marketplace to buy and sell code.

## Folders

### Email
A folder containing html file templates that are used to send to users in emails through the sendEmail() function.

### Other
A folder that contains individual files that do not group with other files.

## Images
A folder that contains png image files.

## Variables

**transporter**: A nodemailer transport with gmail sender authentication.

**client**: The MongoDB client that is used to interact with the database.

## Functions
**randomId(length)**: Takes in a number and returns a random string with that length in characters.

**validateEmail(email)**: Takes in a string. If output is null, then it is not a valid email format else it is.

**dbCreate(collection, data)**: Takes in the collection to add to and the JSON data to add to that collection in MongoDB.

**dbGet(collection, query)**: Takes in the collection to search and the query to search with. The query is an object with a value and a key to match.

**dbUpdateSet(collection, query, data)**: Takes in a collection to search, the query to search with, and the new data to replace.

**dbUpdateInc(collection, query, data)**: Takes in a collection to search, the query to search with, and a JSON object with the key to change and a value of how much to increment the current value by.

**dbUpdatePush(colleciton, query, data)**: Takes in a collection to search, the query to search with, and a JSON object with the key to change and the new value to push to the array.

**getNewUserId()**: Returns an integer for what the new userid should be.

**zeroInt(number)**: Takes in an integer and returns a string with zeros infront if the number is less than 100.

**sendEmail(htmlBody, email, data)**: Takes in the html to send, the email to send to, and an object with keys and values to replace and personalize data from the html. Then send an email.

## Routes

### `GET` /
Just returns a basic html web page.

### `GET` /socials
Redirects the page to a defined social site. This is so that if a link to a social media changes then only one file needs to be changed instead of every instance of that link.

Params:
  - **platforms**: The name of the platform to redirect to.

If an undefined platform is given then a 404 screen will be shown.

### `GET` /images/:name
Returns an image file that is specified at the name paran in the url.

### `POST` /api/join
Creates a new user account in the waitlist collection in MongoDB, sends a welcome email to their email address, and saves role and waitlist user count in adminStats.

Body: 
  - **firstName**: Users first name.
  - **lastName**: Users last name.
  - **email**: Users email.
  - **role**: Users role. Can only be "developer", "buyer", or "both".

Responses: 
  - { code: 200, private: `Users private key to be saved and used to fetch for user data` }
  - { code: 401, errors: `An array of arrays with an error code and an error message.` }
  - { code: 500, err: `The internal server error that caused the catch` }

401 Errors: 
  - `[ 1, "First name required." ]`: The firstName value in the body was either null or empty.
  - `[ 2, "Last name required." ]`: The lastName value in the body was either null or empty.
  - `[ 3, "Email required." ]`: The email value in the body was either null or empty.
  - `[ 4, "Invalid email." ]`: The given email did not pass as a valid email formatt.
  - `[ 5, "Email taken." ]`: An account already created has the save email address.
  - `[ 6, "Invalid role." ]`: The given role was not equal to "developer", "buyer", or "both"

### `POST` /api/getjoined
Gets the users saved data from their private key.

Body: 
  - **private**: The users private key.

Responses:
  - { code: 200, result: `A JSON object with the users data.` }
  - { code: 401, errors: ["Unknown private."] }
  - { code: 500, err: `The internal server error that caused the catch` }
