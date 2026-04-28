const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    /* ===== BASIC INFO ===== */
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address']
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      match: [/^[0-9]{10}$/, 'Mobile number must be 10 digits']
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId; // password not required for Google login
      },
      minlength: 8,
      select: false
    },

    /* ===== GOOGLE LOGIN ===== */
    googleId: {
      type: String,
      default: null,
      index: true
    },

    /* ===== EMAIL VERIFICATION ===== */
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    emailOtp: {
      type: Number,
      default: null
    },

    otpExpiry: {
      type: Date,
      default: null
    },

    /* ===== ROLE ===== */
    role: {
      type: String,
      enum: ['user', 'researcher', 'admin'],
      default: 'user'
    },

    /* ===== ACCOUNT STATUS ===== */
    isActive: {
      type: Boolean,
      default: true   // ✅ NEW (Active / Inactive)
    },

    isBanned: {
      type: Boolean,
      default: false
    },

    isSuspended: {
      type: Boolean,
      default: false
    },

    /* ===== SUBSCRIPTION ===== */
    subscriptionType: {
      type: String,
      enum: ['monthly', 'quarterly', 'yearly'],
      default: 'monthly'   // ✅ NEW
    },

    subscriptionStartDate: {
      type: Date,
      default: Date.now
    },

    subscriptionEndDate: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/* ================= PASSWORD HASH ================= */
userSchema.pre('save', async function () {
  // Skip if no password (Google users)
  if (!this.password) return;

  // Skip if password not modified
  if (!this.isModified('password')) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

/* ================= PASSWORD COMPARE ================= */
userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

/* ================= AUTO SUBSCRIPTION EXPIRY CHECK ================= */
userSchema.methods.isSubscriptionActive = function () {
  if (!this.subscriptionEndDate) return true;
  return new Date() < this.subscriptionEndDate;
};

module.exports = mongoose.model('User', userSchema);