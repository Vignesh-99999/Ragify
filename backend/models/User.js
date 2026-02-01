const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
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
      unique: true,          // ✅ only ONE unique index
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
      required: true,
      minlength: 8,
      select: false
    },

    googleId: {
      type: String,
      default: null,
      index: true
    },

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

    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    isBanned: {
      type: Boolean,
      default: false
    },
    isSuspended: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    versionKey: false
  }
);

/* ================= PASSWORD HASH ================= */
userSchema.pre('save', async function () {
  // If password does not exist, skip
  if (!this.password) return;

  // If password not modified, skip
  if (!this.isModified('password')) return;

  // Hash password
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});
/* ================= PASSWORD COMPARE ================= */
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
