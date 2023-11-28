// models/Product.js
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: String,
    desc: String,
    src: String,
    offerPrice: Number,
    sellingPrice: Number,
    offerPercentage: Number
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
