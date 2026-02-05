const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./models/User');

// GOOGLE STRATEGY
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {

      console.log("✅ GOOGLE CALLBACK HIT");
      console.log("👉 loginRole from session:", req.session?.loginRole);
      console.log("👉 google email:", profile.emails[0].value);

      try {
        const loginRole = req.session?.loginRole || "user";

        let user = await User.findOne({ email: profile.emails[0].value });

        console.log("👉 user from DB:", user);

        if (user && user.role !== loginRole) {
          console.log("❌ ROLE MISMATCH");
          return done(null, false);
        }

        if (!user) {
          user = new User({
            name: profile.displayName,
            email: profile.emails[0].value,
            role: loginRole,
            password: "google-oauth",
            mobile: "0000000000"
          });

          await user.save();
          console.log("✅ NEW USER CREATED");
        }

        return done(null, user);

      } catch (err) {
        console.error("❌ GOOGLE ERROR:", err);
        return done(err, null);
      }
    }
  )
);


// ✅ Passport serialize / deserialize
passport.serializeUser((user, done) => done(null, user._id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

module.exports = passport;
