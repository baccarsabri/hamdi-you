const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require('axios');
const OpenAI = require("openai");
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || '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',
});



const app = express();
const PORT = process.env.PORT || 8080;

app.use(bodyParser.json());
app.use(cors());

// Define a router
const router = express.Router();

router.post('/convertToText', async (req, res) => {
    const securityHeaderValue = req.get('security');
    if (securityHeaderValue != 'security2023') {
        return res.send({ message: 'UnAuthorized' })
    }
    const url = req.body.url;
    const videoId = url.split('?v=')[1];
    if (!videoId) {
        return res.send({ message: 'Invalid Url' })
    }

    const options = {
        method: 'GET',
        url: 'https://youtube-transcriptor.p.rapidapi.com/transcript',
        params: {
            video_id: videoId,
            lang: 'en'
        },
        headers: {
            'X-RapidAPI-Key': '1d6fd60087mshda38ddae71c516cp1a1abejsnc3dbeb8f4fbf',
            'X-RapidAPI-Host': 'youtube-transcriptor.p.rapidapi.com'
        }
    };

    try {
        const response = await axios.request(options);
        if (response) {
            const transcription = response.data[0].transcription;
            console.log(transcription);
            // Extract subtitles from the array of objects
            const subtitles = transcription.map(item => item.subtitle);

            // Concatenate all subtitles into a single string
            const fullText = subtitles.join(' ');

            // Now 'fullText' contains the concatenated subtitles
            //  console.log(fullText);
            try {
                const completion = await openai.chat.completions.create({
                    messages: [{ role: "user", content: `Please summarize this : ${fullText}` }],
                    model: "gpt-3.5-turbo",


                });
                return res.send({ message: completion.choices[0].message.content });
            }
            catch (e) {
                return res.send({ message: fullText });

            }


            //  console.log();


        } else {
            return res.send({ message: 'error on the server please try again ' })
        }

        // Sending the transcript back to the client

    } catch (error) {
        console.error(error);
        // Handle errors and send an appropriate response
        return res.send({ message: 'Internal Server Error' });
    }
});


const apiKey = 'pk_live_51MvOXzBhj9SaeHPHQmVpWmCJLmK1jcv4lwLCg76JPfmtXPXSGX70WwikDlpXY56ocGY4W5FmAcy3Qu06Us7R7cO800hnExtHCz'
//const secretKey = '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'
const secretKey = "sk_test_51MvOXzBhj9SaeHPH4AhDCzRwDHo8s0iwbXvXj0TbYtGTKGSHup9M1wInc2g8u6VIYevevDJNp362YZc0PoceK3Hi00ffWxl10R"

const stripe = require("stripe")(secretKey);


router.post("/create-checkout-session", async (req, res) => {
    const { userId } = req.body;
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
            {
                price_data: {
                    currency: "usd",
                    product_data: {
                        name: 'prudctName'
                    },
                    unit_amount: 1 * 100,
                },
                quantity: 1,
            },
        ],
        mode: "payment",
        success_url: "http://localhost:3000/success",
        cancel_url: "http://localhost:3000/cancel",
        metadata: {
            userId: userId, // Add the user ID to the metadata
        },
    });
    res.json({ id: session.id });
});
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    (request, response) => {
        let event = request.body;
        //      const endpointSecret = 'whsec_t7SjNpQ9oUFPLE4fyP8MTKnMJomvpSh8';
        console.log(event.type);
        console.log(event.data.object.payment_status);


        if (event && event.type == "checkout.session.completed" && event.data.object.payment_status == "paid") {
            const userId = event.data.object.metadata.userId;
            async () => {
                const user = await User.findById(userId);
                console.log(user);
            }
        }




        response.send();
    }
);

// Use the router
app.use('/api', router);

app.listen(PORT, () => {
    console.log(`Server up and running on port ${PORT}`);
});






const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({
    firstname: { type: String, required: true },
    lastname: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    token: { type: String },
    dateRange: {
        startDate: { type: Date },
        endDate: { type: Date }
    }
});



const User = mongoose.model('User', userSchema);

// Connexion à MongoDB
mongoose.connect('mongodb+srv://hamdifrik01:Z2AdW9IA7XTWnShJ@cluster0.dv1aqx0.mongodb.net/');

const db = mongoose.connection;

// Gestion des erreurs de connexion
db.on('error', console.error.bind(console, 'Erreur de connexion à MongoDB :'));
db.once('open', () => {
    console.log('Connecté à MongoDB');
});


// (méthode POST)
router.post('/users', async (req, res) => {
    try {
        const userData = req.body;

        // Vérification si l'utilisateur existe déjà
        const existingUser = await User.findOne({ email: userData.email });

        if (existingUser) {
            return res.status(400).json({ error: 'Email address already exists' });
        }

        //  dates de début et de fin
        userData.dateRange = {
            startDate: req.body.startDate,
            endDate: req.body.endDate
        };

        const newUser = new User(userData);
        const savedUser = await newUser.save();
        res.json(savedUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


//  méthode GET
router.get('/users', async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
