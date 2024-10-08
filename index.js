const express = require("express")
const bcrypt = require('bcrypt')
const multer = require('multer')
const { MongoClient } = require('mongodb')
const cors = require("cors")
const nodemailer = require('nodemailer')
const fs = require("fs")
const archiver = require('archiver')
const path = require('path')
const { isBuffer } = require("util")
const app = express()

app.use(express.json())
app.use(cors())

const storage = multer.memoryStorage()
const upload = multer({ storage })

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'sellsource.co@gmail.com',
      pass: 'bmtaiknkbtfynelw'
    }
})

const client = new MongoClient("mongodb+srv://michaelsutu:HIJMVWsSKSUOqsTi@main.j09lgm6.mongodb.net/?retryWrites=true&w=majority")

/* Function to generate a new random id. Takes in character length. */
const randomId = (length) => {
    try {
        let final = ""
	    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        const charactersLength = characters.length
        let counter = 0
        while (counter < length) {
            final += characters.charAt(Math.floor(Math.random() * charactersLength))
            counter += 1
        }
        return {code: 200, result: final}
    } catch(err) {
        return {code: 500, err: err}
    }
}

/* Function to validate emails. Takes in a string a return whether it is a valid email. */
const validateEmail = (email) => {
    try {
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
        return {code: 200, result: email.toLowerCase().match(emailRegex)}
    } catch(err) {
        return {code: 500, err: err}
    }
}

/* Function to valide phone numbers. Takes in a string and returns whether it is a valid phone number. */
const validatePhone = (phone) => {
    try {
        const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im
        return {code: 200, result: phone.match(phoneRegex) }
    } catch (err) {
        return {code: 500, err: err}
    }
}

/* Function to valide images. Takes in a url and returns whether it is a valid url. */
const validateImage = async (url) => {
    try {
        let valid = false
        const response = await fetch(url)
        if(response.ok) {
            valid = true
        }
        return {code: 200, result: valid }
    } catch (err) {
        return {code: 500, err: err}
    }
}

/* Function to valide phone numbers. Takes in a string and returns whether it is a valid phone number. */
const validateNumber = (string) => {
    try {
        return {code: 200, result: !isNaN(string) && !isNaN(parseFloat(string)) }
    } catch (err) {
        return {code: 500, err: err}
    }
}

/* Function to create a new value in MongoDB. Takes in collection name and data to add. */
const dbCreate = async (collection, data) => {
    try {
        await client.connect()
	    const db = client.db("main")
        await db.collection(collection).insertOne(data)
        return {code: 200}
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function to get data from MongoDB. Takes in collection name and search query. Returns matching value from collection. */
const dbGet = async (collection, query) => {
    try {
        await client.connect()
	    const db = client.db("main")
        const result = await db.collection(collection).findOne(query)
        return {code: 200, result}
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function to get update data from MongoDB by setting to a new value. Takes in collection name, search query and new data. */
const dbUpdateSet = async (collection, query, data) => {
    try {
        await client.connect()
	    const db = client.db("main")
        await db.collection(collection).updateOne(query, { $set: data})
        return {code: 200}
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function to replace values in a MongoDB document. */
const dbUpdateReplace = async (collection, query, data, unset) => {
    try {
        await client.connect()
	    const db = client.db("main")
        await db.collection(collection).updateOne(query, { $set: data, $unset: unset })
        return {code: 200}
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function to get update data from MongoDB by incrementing a value. Takes in collection name, search query and new data. */
const dbUpdateInc = async (collection, query, data) => {
    try {
        await client.connect()
	    const db = client.db("main")
        await db.collection(collection).updateOne(query, { $inc: data})
        return {code: 200}
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function to get update data from MongoDB by pushing a value to an array. Takes in collection name, search query and new data. */
const dbUpdatePush = async (collection, query, data) => {
    try {
        await client.connect()
	    const db = client.db("main")
        await db.collection(collection).updateOne(query, { $push: data}) // Currently does not work. Needs to specify a feild value to change.
        return {code: 200}
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function that returns the new userid based on previous ones in the MongoDB database. */
const getNewUserId = async (email) => {
    try {
        await client.connect()
	    const db = client.db("main")
        const resultCursor = await db.collection("waitlist").find().sort({userId: -1})
        const result = []

        while (await resultCursor.hasNext()) {
            const document = await resultCursor.next()
            result.push(document)
        }

        let highestUserId = 0
        if(result.length > 0) {
            highestUserId = result[0].userId
        }
        
        if(email) {
            let possibleNewId = -1
            for(let i = 0; i < result.length; i++) {
                if(result[i].email == email) {
                    possibleNewId = result[i].userId
                }
            }

            if(possibleNewId == -1) {
                const usersResultCursor = await db.collection("users").find().sort({userId: -1}).limit(1)
                const userResult = []

                while (await usersResultCursor.hasNext()) {
                    const document = await usersResultCursor.next()
                    userResult.push(document)
                }

                let usersHighestUserId = 0
                if(userResult.length > 0) {
                    usersHighestUserId = userResult[0].userId
                }

                if(usersHighestUserId > highestUserId) {
                    return {code: 200, result: usersHighestUserId + 1}
                } else {
                    return {code: 200, result: highestUserId + 1}
                }
            } else {
                return {code: 200, result: possibleNewId}
            }
        } else {
            return {code: 200, result: highestUserId + 1}
        }
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function that returns the new sourceid based on previous ones in the MongoDB database. */
const getNewSourceId = async () => {
    try {
        await client.connect()
	    const db = client.db("main")
        const resultCursor = await db.collection("sources").find().sort({sourceId: -1})
        const result = await resultCursor.toArray()

        let highestSourceId = 0
        if(result.length > 0) {
            highestSourceId = result[0].sourceId
        }
        
        return {code: 200, result: highestSourceId + 1}
    } catch(err) {
        return {code: 500, err: err}
    } finally {
        client.close()
    }
}

/* Function that takes in a number and adds zeros in front to make it look better. */
const zeroInt = (number) => {
    try {
        let numberString = number.toString()
        if (numberString.length < 3) {
            numberString = "0".repeat(3 - numberString.length) + numberString
        }

        return numberString
    } catch(err) {
        return {code: 500, err: err}
    }
}

/* Function that writes a welcome email to someone who has just signed up. */
const sendEmail = async (htmlPath, email, data, subject) => {
    try {
        let htmlBody = await fs.promises.readFile("emails/"+htmlPath, 'utf8')
        Object.entries(data).forEach((entry) => {
            const [key, value] = entry
            htmlBody = htmlBody.replace(key, value)
        })

        const mailOptions = {
            from: 'sellsource.co@gmail.com',
            to: email,
            subject: subject,
            html: htmlBody
        }
        
        transporter.sendMail(mailOptions, function(err, info) {
            if (err) {
                return {code: 500, err: err}
            } else {
                return {code: 200}
            }
        })
    } catch(err) {
        return {code: 500, err: err}
    }
}

/* Post route to add a user to the email wait list while the app is still in development stages. */
app.post("/api/join", async (req, res) => {
    try {
        const firstName = req.body.firstName
        const lastName = req.body.lastName
        const email = req.body.email.toLowerCase()
        const role = req.body.role
        const userId = await getNewUserId()
        const private = randomId(15)
        let errors = []

        if(firstName == "" || firstName == null) {
            errors.push([1, "First name required."])
        }

        if(lastName == "" || lastName == null) {
            errors.push([2, "Last name required."])
        }

        if(email == "" || email == null) {
            errors.push([3, "Email required."])
        } else {
            const testEmail = validateEmail(email)
            if(testEmail.result == null) {
                errors.push([4, "Invalid email."])
            }

            const getEmail = await dbGet("waitlist", {"email": email})
            if(getEmail.result != null) {
                errors.push([5, "Email taken."])
            }
        }

        if(role != "developer" && role != "buyer" && role != "both") {
            errors.push([6, "Invalid role."])
        }

        if(errors.length > 0) {
            res.json({code: 401, errors: errors})
        } else {
            const result = await dbCreate("waitlist", {
                firstName: firstName,
                lastName: lastName,
                email: email,
                role: role,
                userId: userId.result,
                private: private.result
            })

            if(result.code == 200) {
                sendEmail("welcome.html", email, {firstName: firstName, lastName: lastName, userId: zeroInt(userId.result)}, "Welcome to sellsource")
                result.private = private.result
                res.json(result)
            } else {
                res.json(result)
            }
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to get user data from their private key. */
app.post("/api/getjoined", async (req, res) => {
    try {
        const private = req.body.private
        const result = await dbGet("waitlist", {private: private})

        if(result.result == null) {
            res.json({code: 401, errors: ["Unknown private."]})
        } else {
            res.json({code: 200, result: result.result})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route sign up a new user account. */
app.post("/api/signup", async (req, res) => {
    try {
        const firstName = req.body.firstName
        const lastName = req.body.lastName
        const email = req.body.email.toLowerCase()
        const role = req.body.role
        const password = req.body.password
        const userId = await getNewUserId(email)
        const private = randomId(15)
        const verificationCode = randomId(16)
        let phone = ""
        if(req.body.phone) {
            const testPhone = validatePhone(req.body.phone)
            if(testPhone.result != null) {
                phone = req.body.phone
            }
        }
        let errors = []

        if(firstName == "" || firstName == null) {
            errors.push([1, "First name required."])
        }

        if(lastName == "" || lastName == null) {
            errors.push([2, "Last name required."])
        }

        if(email == "" || email == null) {
            errors.push([3, "Email required."])
        } else {
            const testEmail = validateEmail(email)
            if(testEmail.result == null) {
                errors.push([4, "Invalid email."])
            }

            const getEmail = await dbGet("users", {"email": email})
            if(getEmail.result != null && getEmail.result.status != "Deleted") {
                errors.push([5, "Email taken."])
            }
        }

        if(role != "developer" && role != "buyer" && role != "both") {
            errors.push([6, "Invalid role."])
        }

        if(password == "" || password == null) {
            errors.push([7, "Password required."])
        }

        if(errors.length > 0) {
            res.json({code: 401, errors: errors})
        } else {
            bcrypt.genSalt(10, async (err, salt) => {
                bcrypt.hash(password, salt, async function(err, hash) {
                    const result = await dbCreate("users", {
                        firstName: firstName,
                        lastName: lastName,
                        email: email,
                        role: role,
                        userId: userId.result,
                        private: private.result,
                        password: hash,
                        phone: phone,
                        verificationCode: verificationCode.result.toUpperCase(),
                        verified: false
                    })
        
                    if(result.code == 200) {
                        let sendLink = "https://sellsource-backend.onrender.com/api/v?code="+verificationCode.result.toUpperCase()
                        sendEmail("verification.html", email, {hreflink: sendLink, firstName: firstName, lastName: lastName, vcode: sendLink}, "Verify Email Address")
                        result.private = private.result
                        res.json(result)
                    } else {
                        res.json(result)
                    }
                })
            })
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route that just takes in an account private and emails the email its verification code if not yet verified. */
app.post("/api/sendverificationcode", async (req, res) => {
    try {
        const private = req.body.private
        let result = await dbGet("users", {private: private})
        result = result.result
        if(result && result.status != "Deleted") { 
            if(result.verified == true) {
                res.json({code: 401, errors: [2, "Account is already verified."]})
            } else {
                let sendLink = "https://sellsource-backend.onrender.com/api/v?code="+result.verificationCode
                if(result.verificationCode == undefined) {
                    let newCode = randomId(16)
                    newCode = newCode.result.toUpperCase()
                    let update = await dbUpdateSet("users", {private: private}, {verificationCode: newCode, verified: false})
                    if(update.code == 200) {
                        sendEmail("verification2.html", result.email, {firstName: result.firstName, lastName: result.lastName, vcode: sendLink, hreflink: sendLink}, "Verify Email Address")
                        res.json({code: 200})
                    } else {
                        res.json({code: 500, err: update.err})
                    }
                } else {
                    sendEmail("verification2.html", result.email, {firstName: result.firstName, lastName: result.lastName, vcode: sendLink, hreflink: sendLink}, "Verify Email Address")
                    res.json({code: 200})
                }   
            }
        } else {
            res.json({code: 401, errors: [1, "Unknown private."]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Get route that takes in a verification code. */
app.get("/api/v", async (req, res) => {
    try {
        const code = req.query.code

        let result = await dbGet("users", {verificationCode: code})
        result = result.result
        if(result && result.status != "Deleted") { 
            if(result.verified == true) {
                res.json({code: 401, errors: [2, "Account is already verified."]})
            } else {
                let update = await dbUpdateSet("users", {verificationCode: code}, {verified: true})
                if(update.code == 200) {
                    res.redirect("https://sellsource.co/")
                } else {
                    res.json({code: 500, err: update.err})
                }
            }
        } else {
            res.json({code: 401, errors: [1, "Invalid verification code."]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to login a user. */
app.post("/api/login", async (req, res) => {
    try {
        let result = await dbGet("users", {email: req.body.email.toLowerCase()})
        result = result.result
        if(result && result.status != "Deleted") {
            bcrypt.compare(req.body.password, result.password, (err, pass) => {
                if (err) {
                    res.json({code: 500, err: err})
                } else {
                    if (pass) {
                        res.json({code: 200, result: result.private})
                    } else {
                        res.json({code: 401, errors: [2, "Invalid password."]})
                    }
                }
            })
        } else {
            res.json({code: 401, errors: [1, "Unknown email."]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to update a user's password. */
app.post("/api/updatepassword", async (req, res) => {
    try {
        const private = req.body.private
        const password = req.body.password
        const newpassword = req.body.newpassword

        let user = await dbGet("users", {private: private})
        user = user.result
        if(user && user.status != "Deleted") {
            bcrypt.compare(password, user.password, (err, pass) => {
                if (err) {
                    res.json({code: 500, err: err})
                } else {
                    if (pass) {
                        bcrypt.genSalt(10, async (err, salt) => {
                            bcrypt.hash(newpassword, salt, async function(err, hash) {
                                const result = await dbUpdateSet("users", {private: private}, {
                                    password: hash
                                })
                    
                                res.json(result)
                            })
                        })
                        
                    } else {
                        res.json({code: 401, errors: [[2, "Invalid password."]]})
                    }
                } 
            })
        } else {
            res.json({code: 401, errors: [[1, "Unknown private."]]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post to delete a user's account. */
app.post("/api/deleteaccount", async (req, res) => {
    try {
        const private = req.body.private

        let user = await dbGet("users", {private: private})
        user = user.result

        if(user && user.status != "Deleted") {
            const keys = Object.keys(user)
            const keep = ["_id", "userId"]
            let toUnset = {}

            for(let i = 0; i < keys.length; i++) {
                if(keep.indexOf(keys[i]) == -1) {
                    toUnset[keys[i]] = 1
                }
            }

            let update = await dbUpdateReplace("users", {private: private}, {status: "Deleted"}, toUnset)
            res.json(update)
        } else {
            res.json({code: 401, errors: [[1, "Unknown private."]]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route for moderators to remove listings. */
app.post("/api/removelisting", async (req, res) => {
    try {
        const private = req.body.private
        const sourceId = req.body.sourceId
        const note = req.body.note

        let user = await dbGet("users", {private: private})
        user = user.result

        if(note) {
            if(user && user.status != "Deleted") {
                if(private.split("-")[0] == "A") {
                    let source = await dbGet("sources", {sourceId: sourceId})
                    source = source.result
    
                    if(source && source.status != "Deleted") {
                        const keys = Object.keys(source)
                        const keep = ["_id", "sourceId"]
                        let toUnset = {}
    
                        for(let i = 0; i < keys.length; i++) {
                            if(keep.indexOf(keys[i]) == -1) {
                                toUnset[keys[i]] = 1
                            }
                        }       
    
                        let sourceName = source.name
                        let author = await dbGet("users", {userId: source.author})
                        author = author.result
                        let update = await dbUpdateReplace("sources", {sourceId: sourceId}, {status: "Deleted"}, toUnset)
                        sendEmail("removed.html", author.email, {firstName: author.firstName, lastName: author.lastName, sourceName: sourceName, note: note}, "One of your listings has been removed.")
                        res.json(update)
                    } else {
                        res.json({code: 400, errors: [[3, "This source either does not exist or has already been deleted."]]})
                    }
                } else {
                    res.json({code: 401, errors: [[2, "User does not have moderation permission."]]})
                }
            } else {
                res.json({code: 401, errors: [[1, "Unknown private."]]})
            }
        } else {
            res.json({code: 400, errors: [[4, "Moderator note required."]]})
        } 
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to update user profile information. */
app.post("/api/setprofile", async (req, res) => {
    try {
        const private = req.body.private
        const username = req.body.username
        const email = req.body.email
        const options = ["avatar", "displayname", "bio", "website", "github", "linkedin", "twitter"]
        let changes = []
        let errors = []

        let user = await dbGet("users", {private: private})
        user = user.result

        if(user && user.status != "Deleted") {
            if(username) {
                let others = await dbGet("users", {username: username})
                if(others.result && others.result.status != "Deleted") {
                    errors.push([2, "Username already taken."])
                } else {
                    changes.push(username)
                }
            } else {
                if(user.username) {
                    changes.push(user.username)
                } else {
                    changes.push("")
                }
            }

            for(let i = 0; i < options.length; i++) {
                if(req.body[options[i]]) {
                    changes.push(req.body[options[i]])
                } else {
                    if(user[options[i]]) {
                        changes.push(user[options[i]])
                    } else {
                        changes.push("")
                    }
                }
            }

            if(email) {
                if(validateEmail(email).result == null) {
                    errors.push([3, "Invalid email format."])
                } else {
                    let others = await dbGet("users", {email: email})
                    if(others.result && others.result.status != "Deleted") {
                        errors.push([4, "Email arleady taken."])
                    } else {
                        changes.push(email)
                        changes.push(false)
                    }
                }
            } else {
                changes.push(user.email)
                changes.push(user.verified)
            }

            if(errors.length > 0) {
                res.json({code: 400, errors: errors})
            } else {
                const update = await dbUpdateSet("users", {private: private}, {
                    username: changes[0],
                    email: changes[8],
                    verified: changes[9],
                    avatar: changes[1],
                    displayname: changes[2],
                    bio: changes[3],
                    website: changes[4],
                    github: changes[5],
                    linkedin: changes[6],
                    twitter: changes[7]
                })
                if(update.code == 200) {
                    res.json({code: 200})
                } else {
                    res.json(update)
                }
            }
        } else {
            res.json({code: 401, errors: [[1, "Unknown private."]]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to get user account information from their private key. */
app.post("/api/getaccount", async (req, res) => {
    try {
        let private = req.body.private
        let result = await dbGet("users", {private: private})
        result = result.result
        let keys = ["bio", "github", "linkedin", "twitter", "website"]
        let values = []
        let changes = false
        let displayname = ""
        let username = ""
        let avatar = ""

        if(result && result.status != "Deleted") {
            for(let i = 0; i < keys.length; i++) {
                if(result[keys[i]]) {
                    values.push(result[keys[i]])
                } else {
                    values.push("")
                }
            }

            if(result.displayname && result.displayname != "") {
                displayname = result.displayname
            } else {
                changes = true
                displayname = `${result.firstName} ${result.lastName}`
            }

            if(result.username && result.username != "") {
                username = result.username
            } else {
                changes = true
                username = `${result.firstName}-${result.lastName}-${randomId(6).result}`
            }

            if(result.avatar && result.avatar != "") {
                avatar = result.avatar
            } else {
                changes = true
                avatar = `https://sellsource-backend.onrender.com/api/avatars/${Math.floor(Math.random() * 3)}`
            }

            let listings = []
            if(result.listings) {
                listings = result.listings
            }

            let sales = []
            for(let i = 0; i < listings.length; i++) {
                let currentListing = await dbGet("sources", {sourceId: listings[i]})
                currentListing = currentListing.result
                if(currentListing.purchases) {
                    for(let x = 0; x < currentListing.purchases.length; x++) {
                        sales.push({
                            name: currentListing.purchases[x].name,
                            email: currentListing.purchases[x].email,
                            listing: currentListing.name
                        })
                    }
                }
            }

            let purchases = []
            if(result.purchases) {
                purchases = result.purchases
            }

            res.json({code: 200, result: {
                firstName: result.firstName,
                lastName: result.lastName,
                email: result.email,
                role: result.role,
                userId: result.userId,
                phone: result.phone,
                verified: result.verified,
                avatar: avatar,
                bio: values[0],
                displayname: displayname,
                github: values[1],
                linkedin: values[2],
                twitter: values[3],
                username: username,
                website: values[4],
                listings: listings,
                purchases: purchases,
                sales: sales
            }})

            if(changes) {
                await dbUpdateSet("users", {private: private}, {
                    username: username,
                    displayname: displayname,
                    avatar: avatar
                })
            }
        } else {
            res.json({code: 401, errors: [1, "Unknown private."]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Get route to get the default avatar images. */
app.get("/api/avatars/:imageid", (req, res) => {
    try {
        const imageid = req.params.imageid
        if(imageid) {
            let chosen = ""
            if(imageid == 0) {
                chosen = "blue.png"
            } else if(imageid == 1) {
                chosen = "red.png"
            } else if(imageid == 2) {
                chosen = "purple.png"
            } else if(imageid == 3) {
                chosen = "green.png"
            }

            if(chosen == "") {
                res.json({code: 400, err: [[2, "Invalid imageid."]]})
            } else {
                res.sendFile(__dirname+"/images/"+chosen)
            }
        } else {
            res.json({code: 400, err: [[1, "Imageid required."]]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
    
})

/* Post route to return a listings details from its sourceid. */
app.post("/api/getsource", async (req, res) => {
    try {
        let sourceId = req.body.sourceId
        let result = await dbGet("sources", {sourceId: sourceId})
        result = result.result
        if(result && result.status != "Deleted") {
            res.json({code: 200, result: {
                name: result.name,
                thumbnail: result.thumbnail,
                author: result.author,
                visibility: result.visibility,
                sourceId: result.sourceId,
                category: result.category,
                price: result.price,
                gallery: result.gallery,
                description: result.description,
                tags: result.tags
            }})
        } else {
            res.json({code: 401, errors: [1, "Unknown sourceId."]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to purchase sources. */
app.post("/api/purchase", async (req, res) => {
    try {
        const private = req.body.private
        const sources = req.body.sources
        const code = req.body.code
        let user = await dbGet("users", {private: private})
        user = user.result
        if(user && user.status != "Deleted") {
            let newPurchases = []
            if(user.purchases) {
                newPurchases = user.purchases
            }

            if(sources) {
                let total = 0
                let addedSources = []
                for(let i = 0; i < sources.length; i++) {
                    let chosenSources = await dbGet("sources", {sourceId: sources[i]})
                    if(chosenSources.result && chosenSources.result.status != "Deleted" && newPurchases.indexOf(sources[i]) == -1) {
                        total += chosenSources.result.price
                        newPurchases.push(sources[i])
                        addedSources.push(sources[i])
                    }
                }

                let pass = true
                if(code) {
                    let codeData = await dbGet("referrals", { code: code })
                    codeData = codeData.result

                    if(codeData) {
                        if(user.usedCode) {
                            pass = false
                            res.json({code: 400, errors: [4, "User has already used a referral code."]})
                        } else {
                            total = (total * 0.9).toFixed(2)
                            await dbUpdateSet("users", { private: private }, {
                                usedCode: code
                            })

                            await dbUpdateSet("referrals", { code: code }, {
                                uses: codeData.uses + 1,
                                earnings: parseFloat(codeData.earnings) + parseFloat((total * 0.05).toFixed(2))
                            })
                        }
                    } else {
                        pass = false
                        res.json({code: 400, errors: [3, "Unknown referral code."]})
                    }
                }
    
                if(pass) {
                    const result = await dbUpdateSet("users", {private: private}, {purchases: newPurchases})

                    for(let i = 0; i < addedSources.length; i++) {
                        let updatedPurchases = []
                        let currentSource = await dbGet("sources", {sourceId: addedSources[i]})
                        if(currentSource.result.purchases && currentSource.result.status != "Deleted") {
                            updatedPurchases = currentSource.result.purchases
                        }

                        updatedPurchases.push({
                            name: `${user.firstName} ${user.lastName}`,
                            email: user.email
                        })
                        await dbUpdateSet("sources", {sourceId: addedSources[i]}, {purchases: updatedPurchases})
                    }

                    result["total"] = total
                    res.json(result)
                }
            } else {
                res.json({code: 401, errors: [2, "Sources required."]})
            }
        } else {
            res.json({code: 401, errors: [1, "Unknown private."]})
        }
    } catch(err) {
        console.log(err)
        res.json({code: 500, err: err})
    }
})

/* Post route to return multiple sources for display. */
app.post("/api/getsources", async (req, res) => {
    try {
        const query = req.body.query
        let quantity = req.body.quantity
        let type = req.body.type
        let errors = []

        let validQuanity = [1, 2, 3, 4, 5, 10, 25, 50, 100]
        if(validQuanity.indexOf(quantity) == -1) {
            errors.push([1, "Invalid quantity amount."])
        }

        let validTypes = ["random", "search"]
        if(validTypes.indexOf(type) == -1) {
            errors.push([2, "Unsupported search type."])
        }

        if(errors.length > 0) {
            res.json({code: 400, errors: errors})
        } else {
            if(type == "random") {
                await client.connect()
                const db = client.db("main")
                const randomDocuments = await db.collection("sources").aggregate([
                    { $match: { status: { $ne: "Deleted" } } },
                    { $sample: { size: quantity } }]).toArray()

                let final = []
                for(let i = 0; i < randomDocuments.length; i++) {
                    final.push({
                        name: randomDocuments[i].name,
                        thumbnail: randomDocuments[i].thumbnail,
                        author: randomDocuments[i].author,
                        category: randomDocuments[i].category,
                        price: randomDocuments[i].price
                    })
                }

                res.json({ code: 200, result: final })
            } else if(type == "search") {
                if(query == "" || query == null) {
                    res.json({code: 400, err: [3, "Query required for searches."]})
                } else {
                    await client.connect()
                    const db = client.db('main')
                    const collection = db.collection('sources')
    
                    const results = await collection
                        .find({ $text: { $search: query } })
                        .project({ score: { $meta: 'textScore' } })
                        .sort({ score: { $meta: 'textScore' } })
                        .limit(quantity)
                        .toArray()

                    let final = []
                    for(let i = 0; i < results.length; i++) {
                        final.push({
                            name: results[i].name,
                            thumbnail: results[i].thumbnail,
                            author: results[i].author,
                            category: results[i].category,
                            price: results[i].price
                        })
                    }
            
                    res.json({ code: 200, result: final })
                  client.close()
                }
            } else {
                res.json({code: 400, err: [2, "Unsupported search type."]})
            }
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Variable that will hold all information regarding password reset sessions. */
let resetSessions = []

/* Interval to periodically check on resetSessions array and remove any expired sessions. */
const filterSessionsInterval = setInterval((e) => {
    let newSessions = []
    for(let i = 0; i < resetSessions.length; i++) {
        if(Date.now() - resetSessions[i].start < 600000) {
            newSessions.push(resetSessions[i])
        }
    }
    resetSessions = newSessions
}, 600000)

/* Post route to generate a password reset code. */
app.post("/api/resetcode", async (req, res) => {
    try {
        const email = req.body.email
        let result = await dbGet("users", {email: email})
        result = result.result
        if(result && result.status != "Deleted") {
            let resetCode = randomId(6)
            resetCode = resetCode.result.toUpperCase()
            let secretCode = randomId(10)
            secretCode = secretCode.result
            sendEmail("reset.html", email, {firstName: result.firstName, lastName: result.lastName, resetcode: resetCode}, "Your Password Reset Code")

            let newSessions = []
            for(let i = 0; i < resetSessions.length; i++) {
                if(resetSessions[i].email != email) {
                    newSessions.push(resetSessions[i])
                }
            }
            resetSessions = newSessions
            resetSessions.push({resetCode: resetCode, secretCode: secretCode, email: email, start: Date.now()})
            res.json({code: 200})
        } else {
            res.json({code: 401, errors: [1, "Unknown email."]})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to resend password reset code to email. */
app.post("/api/resendresetcode", async (req, res) => {
    try {
        const email = req.body.email
        let result = await dbGet("users", {email: email})
        result = result.result
        let chosen = -1
        for(let i = 0; i < resetSessions.length; i++) {
            if(resetSessions[i].email == email) {
                chosen = resetSessions[i]
            }
        }

        if(chosen == -1) {
            res.json({code: 401, errors: [1, "No email with that password reset session. It might have expired."]})
        } else {
            sendEmail("reset.html", email, {firstName: result.firstName, lastName: result.lastName, resetcode: chosen.resetCode}, "Your Password Reset Code")
            res.json({code: 200})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to verify password reset codes. */
app.post("/api/verifyresetcode", async (req, res) => {
    try {
        const email = req.body.email
        const resetCode = req.body.resetCode
        let chosen = -1
        let chosenIndex = -1
        let errors = []
        for(let i = 0; i < resetSessions.length; i++) {
            if(resetSessions[i].email == email) {
                chosen = resetSessions[i]
                chosenIndex = i
                if(resetSessions[i].resetCode != resetCode) {
                    errors.push([1, "Invalid reset code."])
                } else {
                    resetSessions[i].start = Date.now()
                }
            }
        }

        if(chosen == -1) {
            errors.push([2, "No password reset sessions with that email. It might have expired."])
        }

        if(errors.length > 0) {
            res.json({code: 401, errors: errors})
        } else {
            res.json({code: 200, secretCode: chosen.secretCode})
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Post route to reset a users password. */
app.post("/api/newpassword", async (req, res) => {
    try {
        const email = req.body.email
        const secretCode = req.body.secretCode
        const password = req.body.password
        let chosen = -1
        let chosenIndex = -1
        let errors = []
        for(let i = 0; i < resetSessions.length; i++) {
            if(resetSessions[i].email == email) {
                chosen = resetSessions[i]
                chosenIndex = i
                if(resetSessions[i].secretCode != secretCode) {
                    errors.push([1, "Invalid secretCode."])
                }
            }
        }

        if(chosen == -1) {
            errors.push([2, "No password reset sessions with that email. It might have expired."])
        }

        if(password == "" || password == null) {
            errors.push([3, "Password required."])
        }

        if(errors.length > 0) {
            res.json({code: 401, errors: errors})
        } else {
            resetSessions.splice(chosenIndex, 1)
            bcrypt.genSalt(10, async (err, salt) => {
                bcrypt.hash(password, salt, async function(err, hash) {
                    const result = await dbUpdateSet("users", {email: email}, {password: hash})

                    if(result.code == 200) {
                        res.json(result)
                    } else {
                        res.json(result)
                    }
                })
            })
        }
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Function to validate files when creating sources. */
async function processFileFormation(array, errors, author) {
    for(let x = 0; x < array.length; x++) {
        if(Array.isArray(array[x])) {
            await processFileFormation(array[x], errors, author)
        } else if(typeof array[x] == "number") {
            let chosenFile = await dbGet("files", {fileId: array[x]})
            chosenFile = chosenFile.result
            if(chosenFile) {
                if(chosenFile.author != author) {
                    errors.push([16, "You don't have access to this file."])
                }
            } else {
                errors.push([17, "Unknown fileId."])
            }
        } else {
            errors.push([15, "Invalid file array."])
        }
    }
}

/* Post route for updating sources. */
app.post("/api/updatesource", async (req, res) => {
    try {
        const private = req.body.private
        const sourceId = req.body.sourceId
        const thumbnail = req.body.thumbnail
        const visibility = req.body.visibility
        let tags = req.body.tags
        let price = req.body.price
        let gallery = req.body.gallery
        let files = req.body.files
        const options = ["name", "category", "description"]
        let changes = []
        let errors = []

        let user = await dbGet("users", {private: private})
        user = user.result

        if(user && user.status != "Deleted") {
            let source = await dbGet("sources", {sourceId: sourceId})
            source = source.result

            if(source && source.author == user.userId && source.status != "Deleted") {
                for(let i = 0; i < options.length; i++) {
                    if(req.body[options[i]]) {
                        if(req.body[options[i]] != "" && req.body[options[i]] != null) {
                            changes.push(req.body[options[i]])
                        } else {
                            errors.push(4 + i, `Invalid ${options[i]} value.`)
                        }
                    } else {
                        changes.push(source[options[i]])
                    }
                }

                if(thumbnail) {
                    if(thumbnail == "" || thumbnail == null) {
                        errors.push([7, "Listing thumbnail is required."])
                    } else {
                        let validImage = await validateImage(thumbnail)
                        if(validImage.result == false) {
                            errors.push([8, "Invalid thumbnail provided."])
                        }  else {
                            changes.push(thumbnail)
                        }
                    }
                } else {
                    changes.push(source.thumbnail)
                }

                if(visibility) {
                    if(visibility == "" || visibility == null) {
                        errors.push([9, "Listing visibility is required."])
                    } else {
                        if(visibility != "open" && visibility != "closed") {
                            errors.push([10, "Invalid visibility provided. Must be 'open' or 'closed'."])
                        } else {
                            changes.push(visibility)
                        }
                    }
                } else {
                    changes.push(source.visibility)
                }

                if(tags) {
                    if(tags == "" || tags == null) {
                        errors.push([11, "Listing tags are required."])
                    } else {
                        tags = tags.replace(/'/g, '"')
                        tags = JSON.parse(tags)
            
                        if(tags.length > 20) {
                            errors.push([12, "Can't have more then 20 tags."])
                        } else {
                            changes.push(tags)
                        }
                    }
                } else {
                    changes.push(source.tags)
                }

                if(price) {
                    if(price == "" || price == null) {
                        errors.push([13, "Listing price is required."])
                    } else {
                        let validNum = validateNumber(price)
                        if(validNum.result) {
                            price = parseInt(price)
                            changes.push(price)
                        } else {
                            errors.push([14, "Listing price must be a valid integer."])
                        }
                    }
                } else {
                    changes.push(source.price)
                }

                if(gallery) {
                    if(gallery == "" || gallery == null) {
                        gallery = []
                    } else {
                        gallery = gallery.replace(/'/g, '"')
                        gallery = JSON.parse(gallery)
                    }

                    changes.push(gallery)
                } else {
                    changes.push(source.gallery)
                }

                if(files) {
                    if(files == "" || files == null) {
                        errors.push([15, "Files are required."])
                    } else {
                        files = files.replace(/'/g, '"')
                        files = JSON.parse(files)
            
                        await processFileFormation(files, errors, source.author)
                        changes.push(files)
                    }
                } else {
                    changes.push(source.files)
                }

                if(errors.length > 0) {
                    res.json({code: 400, errors: errors})
                } else {
                    const update = await dbUpdateSet("sources", {sourceId: sourceId}, {
                        name: changes[0],
                        category: changes[1],
                        description: changes[2],
                        thumbnail: changes[3],
                        visibility: changes[4],
                        tags: changes[5],
                        price: changes[6],
                        gallery: changes[7],
                        files: changes[8]
                    })

                    if(update.code == 200) {
                        res.json({code: 200})
                    } else {
                        res.json(update)
                    }
                }
            } else if(source && source.author != user.userId) {
                res.json({code: 401, errors: [[3, "This account is not the author of the source."]]})
            } else {
                res.json({code: 401, errors: [[2, "Unknown sourceId."]]})
            }
        } else {
            res.json({code: 401, errors: [[1, "Unknown private."]]})
        }
    } catch(err) {
        console.log(err)
        res.json({code: 500, err: err})
    }
})

/* Post route for created source. */
app.post("/api/newsource", async (req, res) => {
    try {
        const name = req.body.name
        const thumbnail = req.body.thumbnail
        const private = req.body.private
        const visibility = req.body.visibility
        const category = req.body.category
        let tags = req.body.tags
        let price = req.body.price
        let gallery = req.body.gallery
        const description = req.body.description
        const getSource = await getNewSourceId()
        const sourceId = getSource.result
        let files = req.body.files
        let author = -1
        let errors = []

        if(name == "" || name == null) {
            errors.push([1, "Listing name is required."])
        }

        if(thumbnail == "" || thumbnail == null) {
            errors.push([2, "Listing thumbnail is required."])
        } else {
            let validImage = await validateImage(thumbnail)
            if(validImage.result == false) {
                errors.push([3, "Invalid thumbnail provided."])
            } 
        }

        if(visibility == "" || visibility == null) {
            errors.push([4, "Listing visibility is required."])
        } else {
            if(visibility != "open" && visibility != "closed") {
                errors.push([5, "Invalid visibility provided. Must be 'open' or 'closed'."])
            } 
        }

        if(tags == "" || tags == null) {
            errors.push([8, "Listing tags are required."])
        } else {
            tags = tags.replace(/'/g, '"')
            tags = JSON.parse(tags)

            if(tags.length > 20) {
                errors.push([9, "Can't have more then 20 tags."])
            }
        }

        if(category == "" || category == null) {
            errors.push([6, "Listing category is required."])
        }

        if(price == "" || price == null) {
            errors.push([7, "Listing price is required."])
        } else {
            let validNum = validateNumber(price)
            if(validNum.result) {
                price = parseInt(price)
            } else {
                errors.push([13, "Listing price must be a valid integer."])
            }
        }

        if(description == "" || description == null) {
            errors.push([10, "Listing description is required."])
        }

        const user = await dbGet("users", {private: private})
        if(user.result == null || user.result.status == "Deleted") {
            errors.push([11, "Unknown user private key."])
        } else {
            if(user.result.verified != true) {
                errors.push([12, "Account not verified."])
            }
            author = user.result.userId
        }

        if(files == "" || files == null) {
            errors.push([14, "Files are required."])
        } else {
            files = files.replace(/'/g, '"')
            files = JSON.parse(files)

            await processFileFormation(files, errors, author)
        }

        if(gallery == "" || gallery == null) {
            gallery = []
        } else {
            gallery = gallery.replace(/'/g, '"')
            gallery = JSON.parse(gallery)
        }

        if(errors.length > 0) {
            res.json({code: 401, errors: errors})
        } else {
            const result = await dbCreate("sources", {
                name: name,
                thumbnail: thumbnail,
                author: author,
                visibility: visibility,
                sourceId: sourceId,
                category: category,
                price: price,
                gallery: gallery,
                description: description,
                tags: tags,
                files: files
            })

            let updatedListings = []
            if(user.result.listings) {
                updatedListings = user.result.listings
            }
            updatedListings.push(sourceId)
            await dbUpdateSet("users", {private: private}, {listings: updatedListings})

            if(result.code == 200) {
                result.sourceId = sourceId
                res.json(result)
            } else {
                res.json(result)
            }
        }
    } catch(err) {
        console.log(err)
        res.json({code: 500, err: err})
    }
})

/* Interval that saves the first file in the queue to MongoDB. */
let uploadInterval = setInterval(async (e) => {
    if(fileUploadQueue.length > 0) {
        try {
            let toUpload = fileUploadQueue[0]
            fileUploadQueue.shift()
            await dbCreate("files", {
                name: toUpload.name,
                data: toUpload.data,
                fileId: toUpload.fileId,
                size: toUpload.size,
                author: toUpload.author
            })
        } catch(err) {
            console.error(err)
        }
    }
}, 1000)

let fileUploadQueue = []

/* Post route to save uploaded code. */
app.post('/api/uploadcode', upload.array('files'), async (req, res) => {
    try {
        const uploadedFiles = req.files
        const private = req.body.private
        let uploadResults = []
        let user = await dbGet("users", { private: private })
        user = user.result

        await client.connect()
        const db = client.db("main")

        if(user && user.status != "Deleted") {
            if(user.verified == true) {
                let offset = 0
                let indexFileId = (await db.collection("files").countDocuments()) + 1 + fileUploadQueue.length
                for (const file of uploadedFiles) {
                    if (file.size < 1.5e+7) {
                        const { originalname, buffer } = file

                        fileUploadQueue.push({
                            name: originalname,
                            data: buffer,
                            fileId: indexFileId + offset,
                            size: file.size,
                            author: user.userId
                        })

                        uploadResults.push({ name: originalname, fileId: indexFileId + offset })
                        offset += 1
                    } else {
                        uploadResults.push({ name: file.originalname, err: "File too large." })
                    }
                }

                await client.close()

                res.json({ code: 200, result: uploadResults })
            } else {
                res.json({code: 401, err: "Account not verified."})
            }
        } else {
            res.json({ code: 401, err: "Unknown private." })
        }
    } catch (error) {
        console.error(error)
        res.json({ code: 500, err: error })
    }
})

/* Get route to download already uploaded code. */
app.get('/api/downloadcode', async (req, res) => {
    try {
        const private = req.query.private
        const sourceId = parseInt(req.query.sourceId)

        let source = await dbGet("sources", {sourceId: sourceId})
        source = source.result
        let user = await dbGet("users", { private: private })
        user = user.result

        if(user && user.status != "Deleted") {
            if(source && source.status != "Deleted") {
                if(user.purchases && user.purchases.includes(sourceId)) {
                    const fileIds = source.files
                    const name = source.name

                    const tempDir = path.join(__dirname, 'temp')
                    if (!fs.existsSync(tempDir)) {
                        fs.mkdirSync(tempDir)
                    }
                    
                    const filesToDownload = []
                    
                    for (let fileId of fileIds) {
                        fileId = parseInt(fileId)
                        let file = await dbGet("files", { fileId: fileId })
                        file = file.result
                    
                        if (!file) {
                            console.error(`File with ID ${fileId} not found`)
                            continue
                        }
                    
                        if (!file.data) {
                            console.error(`File data for ID ${fileId} is missing or invalid.`)
                            continue
                        }
                    
                        const binaryData = Buffer.from(file.data.buffer, 'base64')
                        const filePath = path.join(tempDir, file.name)
                        fs.writeFileSync(filePath, binaryData)
                    
                        filesToDownload.push({
                            path: filePath,
                            name: file.name,
                        })
                    }
                    
                    const zipFileName = `${name}.zip`
                    const zipFilePath = path.join(tempDir, zipFileName)
                    const output = fs.createWriteStream(zipFilePath)
                    const archive = archiver('zip', { zlib: { level: 9 } })
                    
                    output.on('close', () => {
                      res.setHeader('Content-Type', 'application/zip')
                      res.setHeader('Content-Disposition', `attachment; filename=${zipFileName}`)
                    
                      res.sendFile(zipFilePath, {}, (err) => {
                        if (err) {
                          console.error(err)
                          res.status(500).send('Internal server error')
                        } else {
                            filesToDownload.forEach((file) => fs.unlinkSync(file.path))
                            fs.unlinkSync(zipFilePath)
                        }
                      })
                    })
                    archive.pipe(output)
                    
                    filesToDownload.forEach((file) => {
                        archive.file(file.path, { name: file.name })
                    })
                    
                    archive.finalize()
                } else {
                    res.json({ code: 401, err: "User does not have access to download these files." })
                }
            } else {
                res.json({ code: 400, err: "Unknown sourceId." })
            }
        } else {
            res.json({ code: 401, err: "Unknown private." })
        }
    } catch (error) {
        console.error(error)
        res.json({ code: 500, err: error })
    }
})

/* Post route to create a new referral code. */
app.post('/api/newreferral', async (req, res) => {
    try {
        const code = req.body.code.toLowerCase()
        const private = req.body.private
        let user = await dbGet("users", { private: private })
        user = user.result

        if(user && user.status != "Deleted") {
            if(user.verified == true) {
                if(code == "" || code == null) {
                    res.json({code: 400, err: "New referral code is required."})
                } else {
                    let exists = await dbGet("referrals", { author: user.userId })
                    exists = exists.result

                    if(exists) {
                        res.json({code: 400, err: "User already has a referral code."})
                    } else {
                        let used = await dbGet("referrals", { code: code })
                        used = used.result

                        if(used) {
                            res.json({code: 400, err: "Referral code taken."})
                        } else {
                            let result = await dbCreate("referrals", {
                                author: user.userId,
                                code: code,
                                uses: 0,
                                earnings: 0
                            })

                            res.json(result)
                        }
                    }
                }
            } else {
                res.json({code: 401, err: "Account not verified."})
            }
        } else {
            res.json({ code: 401, err: "Unknown private." })
        }
    } catch (error) {
        res.json({ code: 500, err: error })
    }
})

/* Post route to get stats related to the useage of a referral code. */
app.post('/api/getreferral', async (req, res) => {
    try {
        const private = req.body.private
        let user = await dbGet("users", { private: private })
        user = user.result

        if(user && user.status != "Deleted") {
            let codeData = await dbGet("referrals", { author: user.userId })
            codeData = codeData.result

            if(codeData) {
                res.json({ code: 200, result: {
                    code: codeData.code,
                    uses: codeData.uses,
                    earnings: codeData.earnings
                }})
            } else {
                res.json({ code: 400, err: "User does not have a referral code." })
            }
        } else {
            res.json({ code: 401, err: "Unknown private." })
        }
    } catch (error) {
        res.json({ code: 500, err: error })
    }
})

/* Get route that returns a basic html page. */
app.get("/", (req, res) => {
    try {
        res.sendFile(__dirname+"/index.html")
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Get route that redirects to social media links. */
app.get("/socials", (req, res) => {
    try {
        res.sendFile(__dirname+"/other/socials.html")
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Get route that sends image files from the image folder. */
app.get("/images/:name", (req, res) => {
    try {
        res.sendFile(__dirname+`/images/${req.params.name}`)
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Get route that returns an html file to preview how an email may look. */
app.get("/email/:name", (req, res) => {
    try {
        res.sendFile(__dirname+`/emails/${req.params.name}`)
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Get route that loads the page for testing out file hosting related processes. */
app.get("/form", (req, res) => {
    try {
        res.sendFile(__dirname+`/other/form.html`)
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

/* Get route that loads the page for testing out file downloading. */
app.get("/download", (req, res) => {
    try {
        res.sendFile(__dirname+`/other/download.html`)
    } catch(err) {
        res.json({code: 500, err: err})
    }
})

app.listen(3000)
console.log("Listening on http://localhost:3000")
