// const Razorpay = require('razorpay');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET
// });

// ✅ CREATE ORDER
// exports.createOrder = async (req, res) => {
//   try {
//     const { amount } = req.body;

//     const order = await razorpay.orders.create({
//       amount,
//       currency: 'INR',
//       receipt: `receipt_${Date.now()}`
//     });

//     res.json(order);
//   } catch (err) {
//     console.error('❌ ORDER ERROR:', err.message);
//     res.status(500).json({ error: 'Order creation failed' });
//   }
// };

// CREATE STRIPE CHECKOUT SESSION


exports.createCheckoutSession = async (req, res) => {
  try {
    const { amount, plan, email } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'inr',
            product_data: {
              name: `Ragify - ${plan}`
            },
            unit_amount: amount * 100
          },
          quantity: 1
        }
      ],
      success_url: 'http://localhost:4200/payment-success',
      cancel_url: 'http://localhost:4200/payment-cancel'
    });

    // ✅ IMPORTANT CHANGE
    res.json({ url: session.url });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};


// ✅ PAYMENT SUCCESS EMAIL
exports.paymentSuccess = async (req, res) => {
  const { email, plan, amount } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    await transporter.sendMail({
      from: `"Ragify" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Payment Successful 🎉',
      html: `
        <h2>Payment Successful</h2>
        <p><b>Plan:</b> ${plan}</p>
        <p><b>Amount:</b> ₹${amount}</p>
        <p>Thank you for subscribing 🚀</p>
      `
    });

    res.json({ success: true });
  } catch (err) {
    console.error('❌ EMAIL FAILED:', err.message);
    res.status(500).json({ success: false });
  }
};
