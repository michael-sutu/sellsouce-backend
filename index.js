const express = require("express")
const bcrypt = require('bcrypt')
const multer = require('multer')
const { MongoClient } = require('mongodb')
const cors = require("cors")
const nodemailer = require('nodemailer')
const fs = require("fs")
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
            if(getEmail.result != null) {
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
        if(result) { 
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
        if(result) { 
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
        let result = await dbGet("users", {email: req.body.email})
        result = result.result
        if(result) {
            bcrypt.compare(req.body.password, result.password, (err, pass) => {
                if (err) {
                    res.json({code: 500, err: err})
                }
    
                if (pass) {
                    res.json({code: 200, result: result.private})
                } else {
                    res.json({code: 401, errors: [2, "Invalid password."]})
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
        if(user) {
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

        if(user) {
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

        if(user) {
            if(username) {
                let others = await dbGet("users", {username: username})
                if(others.result) {
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
                    if(others.result) {
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

        if(result) {
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
                website: values[4]
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
        if(result) {
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

/* Post route to return multiple sources for display. */
app.post("/api/getsources", async (req, res) => {
    try {
        let quantity = req.body.quantity
        let type = req.body.type
        let errors = []

        let validQuanity = [1, 2, 3, 4, 5, 10, 25, 50, 100]
        if(validQuanity.indexOf(quantity) == -1) {
            errors.push([1, "Invalid quantity amount."])
        }

        let validTypes = ["random"]
        if(validTypes.indexOf(type) == -1) {
            errors.push([2, "Unsupported search type."])
        }

        if(errors.length > 0) {
            res.json({code: 400, errors: errors})
        } else {
            if(type == "random") {
                await client.connect()
                const db = client.db("main")
                const randomDocuments = await db.collection("sources").aggregate([{ $sample: { size: quantity } }]).toArray()

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
        if(result) {
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
        if(user.result == null) {
            errors.push([11, "Unknown user private key."])
        } else {
            if(user.result.verified !== true) {
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
app.post('/uploadcode', upload.array('files'), async (req, res) => {
    try {
        const uploadedFiles = req.files
        const private = req.body.private
        let uploadResults = []
        let user = await dbGet("users", { private })
        user = user.result

        await client.connect()
        const db = client.db("main")

        if (user) {
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

app.listen(3000)
console.log("Listening on http://localhost:3000")
