const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();

// --- CRITICAL FIX FOR IMAGE UPLOADS ---
// This allows large files (images) to be sent to the server
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors());

// --- 1. MONGODB CONNECTION ---
const MONGO_URI = 'mongodb+srv://orphasafeadmin:OrphaSafe123@cluster0.vkwibsi.mongodb.net/orphasafe?retryWrites=true&w=majority'; 

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch(err => console.log("❌ DB Error:", err));

// --- 2. SCHEMAS ---

const UserSchema = new mongoose.Schema({
    role: String,
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: String,
    name: String,
    address: String,
    pincode: String,
    orgName: String,
    orgType: String,
    managerName: String,
    managerPhone: String
});
const User = mongoose.model('User', UserSchema);

const ContactSchema = new mongoose.Schema({
    name: String,
    email: String,
    message: String,
    date: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', ContactSchema);

const DonationSchema = new mongoose.Schema({
    donorName: String,
    phone: String,
    address: String,
    city: String,
    pincode: String,
    item: String,
    orgName: String,
    trackingId: String,
    status: { type: String, default: "Pending" },
    
    // Verification Fields
    isReceived: Boolean,
    proofImage: String, // Stores the image code
    failureReason: String,
    verifiedAt: Date
});
const Donation = mongoose.model('Donation', DonationSchema);

// --- 3. API ROUTES ---

// Register
app.post('/api/register', async (req, res) => {
    try {
        const { email } = req.body;
        const existing = await User.findOne({ email });
        if(existing) return res.status(400).json({ error: "Email already exists" });
        const newUser = new User(req.body);
        await newUser.save();
        res.status(201).json({ message: "Registration Successful", user: newUser });
    } catch(e) { res.status(500).json({ error: "Server Error" }); }
});

// Login
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if(!user || user.password !== password) return res.status(400).json({ error: "Invalid Credentials" });
        res.json({ message: "Login Success", user: user });
    } catch(e) { res.status(500).json({ error: "Server Error" }); }
});

// Contact
app.post('/api/contact', async (req, res) => {
    try {
        const newContact = new Contact(req.body);
        await newContact.save();
        res.status(201).json({ message: "Message Sent Successfully!" });
    } catch(e) { res.status(500).json({ error: "Failed to send message" }); }
});

// Donate
app.post('/api/donate', async (req, res) => {
    try {
        const newDonation = new Donation(req.body);
        await newDonation.save();
        res.status(201).json({ message: "Donation Confirmed!", donation: newDonation });
    } catch(e) { res.status(500).json({ error: "Failed to save donation" }); }
});

// Verify Donation (With Image Handling)
app.post('/api/verify-donation', async (req, res) => {
    try {
        console.log("Received Verification Request for ID:", req.body.trackingId); // Debug Log

        const { trackingId, isReceived, proofImage, failureReason } = req.body;

        const updateData = {
            status: isReceived ? "Completed" : "Issue Reported",
            isReceived: isReceived,
            verifiedAt: new Date()
        };

        if (isReceived) {
            updateData.proofImage = proofImage;
        } else {
            updateData.failureReason = failureReason;
        }

        const donation = await Donation.findOneAndUpdate(
            { trackingId: trackingId },
            updateData,
            { new: true }
        );

        if (!donation) {
            console.log("Donation ID not found in DB");
            return res.status(404).json({ error: "Donation not found" });
        }

        console.log("Verification Saved Successfully!");
        res.json({ message: "Verification Submitted Successfully!", data: donation });

    } catch (e) {
        console.error("Verification Error:", e); // Print error to terminal
        res.status(500).json({ error: "Verification Failed: " + e.message });
    }
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));