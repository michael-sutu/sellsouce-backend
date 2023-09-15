const express = require("express")
const bcrypt = require('bcrypt')
const { MongoClient, ServerApiVersion } = require('mongodb')
const cors = require("cors")
const nodemailer = require('nodemailer')
const fs = require("fs")
const app = express()

app.use(express.json())
app.use(cors())

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
        const result = await resultCursor.toArray()

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
                const userResult = await usersResultCursor.toArray()

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
        const verificationCode = randomId(6)
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
                        sendEmail("verification.html", email, {firstName: firstName, lastName: lastName, vcode: verificationCode.result.toUpperCase()}, "Verify Email Address")
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
                if(result.verificationCode == undefined) {
                    let newCode = randomId(6)
                    newCode = newCode.result.toUpperCase()
                    let update = await dbUpdateSet("users", {private: private}, {verificationCode: newCode, verified: false})
                    if(update.code == 200) {
                        sendEmail("verification2.html", result.email, {firstName: result.firstName, lastName: result.lastName, vcode: newCode}, "Verify Email Address")
                        res.json({code: 200})
                    } else {
                        res.json({code: 500, err: update.err})
                    }
                } else {
                    sendEmail("verification2.html", result.email, {firstName: result.firstName, lastName: result.lastName, vcode: result.verificationCode}, "Verify Email Address")
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

/* Post route that takes in an account private and its verification code to verify the account. */
app.post("/api/verifyemail", async (req, res) => {
    try {
        const private = req.body.private
        const code = req.body.verificationCode

        let result = await dbGet("users", {private: private})
        result = result.result
        if(result) { 
            if(result.verified == true) {
                res.json({code: 401, errors: [2, "Account is already verified."]})
            } else {
                if(code == result.verificationCode) {
                    let update = await dbUpdateSet("users", {private: private}, {verified: true})
                    if(update.code == 200) {
                        res.json({code: 200})
                    } else {
                        res.json({code: 500, err: update.err})
                    }
                } else {
                    res.json({code: 401, errors: [3, "Invalid verification code."]})
                } 
            }
        } else {
            res.json({code: 401, errors: [1, "Unknown private."]})
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

/* Post route for created source. */
app.post("/api/newsource", async (req, res) => {
    try {
        const name = req.body.name
        const thumbnail = req.body.thumbnail
        const private = req.body.private
        const type = req.body.type
        let category = req.body.category
        let price = req.body.price
        let gallery = req.body.gallery
        const scale = req.body.scale
        const description = req.body.description
        const getSource = await getNewSourceId()
        const sourceId = getSource.result
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

        if(type == "" || type == null) {
            errors.push([4, "Listing type is required."])
        } else {
            if(type != "open" && type != "closed") {
                errors.push([5, "Invalid type provided. Must be 'open' or 'closed'."])
            } 
        }

        if(category == "" || category == null) {
            errors.push([6, "Listing category is required."])
        } else {
            category = category.replace(/'/g, '"')
            category = JSON.parse(category)
        }

        if(price == "" || price == null) {
            errors.push([7, "Listing price is required."])
        } else {
            let validNum = validateNumber(price)
            if(validNum.result) {
                price = parseInt(price)
            } else {
                errors.push([12, "Listing price must be a valid integer."])
            }
        }

        if(scale == "" || scale == null) {
            errors.push([8, "Listing scale is required."])
        } else {
            if(scale != "individuals" && scale != "enterprises" && scale != "small business") {
                errors.push([9, "Invalid scale provided. Must be 'individuals', 'enterprises', or 'small businesses'."])
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
                errors.push([13, "Account not verified."])
            }
            author = user.result.userId
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
                type: type,
                sourceId: sourceId,
                category: category,
                price: price,
                gallery: gallery,
                scale: scale,
                description: description
            })

            if(result.code == 200) {
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

app.listen(3000)
console.log("Listening on http://localhost:3000")
