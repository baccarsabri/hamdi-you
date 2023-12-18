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


const apiKey = 'pk_test_51OJOU3GEYGkacqc0Zc76oBKIvQRvl8wWoWUBHVBIRnt90OqJ0wqDF5p0o8mLMdZhoXHIACl5wmTzRkYkFHVI7RHR004dRDa0uU'
const secretKey = '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'

const stripe = require("stripe")(secretKey);


router.post("/create-checkout-session", async (req, res) => {
    const { product } = req.body;
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
    });
    const webhookEndpoint = await stripe.webhookEndpoints.create({
        enabled_events: ['*'],
        url: 'https://backend-youtube-y43m.onrender.com/api/webhook',
    });
    res.json({ id: session.id });
});
router.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
    } catch (err) {
        response.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    console.log(event.type);

    // Handle the event
    switch (event.type) {
        case 'payment_intent.succeeded':
            const paymentIntentSucceeded = event.data.object;

            // Then define and call a function to handle the event payment_intent.succeeded
            break;
        // ... handle other event types
        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    response.send();
});
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
