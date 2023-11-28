const mongoose = require('mongoose');

// Define the cart item schema
const cartItemSchema = new mongoose.Schema({
    imgurl: String,
    name: String,
    price: Number,
    productId: String,
    quantity: Number,
});

// Define the order schema
const orderSchema = new mongoose.Schema({
    orderId: String, // Adding orderId field
    address: {
        email: String,
        fullname: String,
        address: String,
        state: String,
        zip: String,
    },
    cartItems: [cartItemSchema], // Embed the cartItem schema within the order schema
    subtotal: Number,
    shipping: Number,
    total: Number,
    status: {
        type: String,
        default: 'pending',
    },
    date: {
        type: Date,
        default: Date.now,
    },
    userId: String,
});

// Create a model for the order schema
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
