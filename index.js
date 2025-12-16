// index.js
const express = require("express");
const app = express();
require("dotenv").config();

// middleware
app.use(express.json());

// routes import
const loginRoutes = require("./login");
const signupRoutes = require("./sign-up");
const profileRoutes = require("./profile");
const profileStatusRoutes = require("./profileStatus");
const subjectsRouter  = require("./subject");
const availabilityRoutes = require("./availability");

// const quizSubjectsRoutes = require("./quizSubjects");
// const quizAIRoutes = require("./quizAI");

const quizAIRoutes = require("./quizAI");

const dashboardRoutes = require("./dashboard");

const dashboardUpdateRoutes = require("./dashboardUpdate");

const availabilityUpdateRoutes = require("./availabilityUpdate");

const subjectUpdateRoutes = require("./subjectsUpdate"); // PUT route

const profileUpdateRoutes = require("./profileUpdate");

const quizSubmitRoutes = require("./quizSubmit");

const profileSearchRouter = require("./profileSearch");

const searchUsers = require("./searchUsers");

const forgotPasswordRoute = require("./forgotPassword");

const publicProfileRouter = require("./publicProfile");

const swapRequestsRouter = require("./swapRequests");

const receiverSwapRoutes = require("./receiverSwapRequests");




// ------------------------------------------------



app.use("/api/login", loginRoutes);
app.use("/api/sign-up", signupRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/profile/status", profileStatusRoutes);
app.use("/api/subjects", subjectsRouter);
app.use("/api/availability", availabilityRoutes);

// app.use("/api", quizSubjectsRoutes);
// app.use("/api", quizAIRoutes);

app.use("/api", quizAIRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/dashboard/update", dashboardUpdateRoutes);

app.use("/api/availability", availabilityUpdateRoutes);

app.use("/api/subjects/update", subjectUpdateRoutes);

app.use("/api/profile", profileUpdateRoutes);

app.use("/api", quizSubmitRoutes);

app.use("/api/search", profileSearchRouter);

app.use("/api/search-users", searchUsers);

app.use("/api/forgot-password", forgotPasswordRoute);

// ✅ Full profile route
// app.use("/api/full-profile", require("./fullProfile"));

// app.use("/api/public-profile", require("./publicProfile"));

app.use("/api/public-profile", publicProfileRouter);

app.use("/api/swap-request", swapRequestsRouter);

app.use("/api/receiver-swap", receiverSwapRoutes);



// server listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
