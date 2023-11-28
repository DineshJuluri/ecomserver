const express = require('express');
const mongoose = require('mongoose');
const User = require('./models/User');
const Product = require('./models/Product');
const Cart = require('./models/Cart')
const Order = require('./models/Order');
const cors = require('cors');
const app = express();
const port = 3000;
app.use(express.json());
app.use(cors());

// MongoDB connection URI
const uri = `mongodb+srv://VirtuoMart:AziO95ZrVxGVLw4g@ecommerce.qssaue2.mongodb.net/?retryWrites=true&w=majority` // Change this URI to match your MongoDB setup



mongoose.connect(`${uri}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});


// Route to handle creating a user
app.post('/create-user', async (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
        res.status(400).send('Please provide fullName, email, and password');
        return;
    }
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(409).send('Email already registered');
            return;
        }
        const newUser = new User({ fullName, email, password });
        await newUser.save();
        const newCart = new Cart({ userid: newUser._id, items: [] });
        await newCart.save();
        res.send('User created successfully');
    } catch (err) {
        console.error('Error creating user:', err);
        res.status(500).send('Error creating user');
    }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        res.status(400).send('Please provide email and password');
        return;
    }
    try {
        const user = await User.findOne({ email });
        if (!user) {
            res.send('Email not found');
            return;
        }
        if (user.password !== password) {
            res.send('Incorrect password');
            return;
        }

        res.send(user);
    } catch (err) {
        console.error('Error retrieving user:', err);
        res.status(500).send('Server error');
    }
});


app.get('/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});



app.post('/add-to-cart', async (req, res) => {
    const { userId, productId } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).send('User not found');
            return;
        }
        let cart = await Cart.findOne({ userid: userId });
        if (!cart) {
            cart = new Cart({ userid: userId, items: [] });
        }
        const cartItem = cart.items.find(item => item.productId.toString() === productId);
        if (cartItem) {
            cartItem.quantity += 1;
        } else {
            cart.items.push({ productId, quantity: 1 });
        }
        await cart.save();
        res.status(200).send('Product added to cart successfully');
    } catch (err) {
        console.error('Error adding product to cart:', err);
        res.status(500).send('Error adding product to cart');
    }
});

app.put('/update-cart-quantity', async (req, res) => {
    const { userId, productId, action } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).send('User not found');
            return;
        }

        let cart = await Cart.findOne({ userid: userId });
        if (!cart) {
            res.status(404).send('Cart not found');
            return;
        }

        const cartItem = cart.items.find(item => item.productId.toString() === productId);
        if (!cartItem) {
            res.status(404).send('Product not found in cart');
            return;
        }

        if (action === 'increment') {
            cartItem.quantity += 1;
        } else if (action === 'decrement') {
            if (cartItem.quantity > 1) {
                cartItem.quantity -= 1;
            }
        }

        await cart.save();
        res.status(200).send('Quantity updated successfully');
    } catch (err) {
        console.error('Error updating quantity in cart:', err);
        res.status(500).send('Error updating quantity in cart');
    }
});


app.get('/total-cart-items/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const cart = await Cart.findOne({ userid: userId });
        if (!cart) {
            res.status(404).send('Cart not found');
            return;
        }
        const totalQuantity = cart.items.reduce((total, item) => {
            return total + item.quantity;
        }, 0);

        res.send({ totalQuantity });
    } catch (err) {
        console.error('Error fetching total cart items:', err);
        res.status(500).send('Error fetching total cart items');
    }
});

app.delete('/remove-from-cart/:userId/:productId', async (req, res) => {
    const { userId, productId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            res.status(404).send('User not found');
            return;
        }

        let cart = await Cart.findOne({ userid: userId });
        if (!cart) {
            res.status(404).send('Cart not found');
            return;
        }

        const cartItemIndex = cart.items.findIndex(
            (item) => item.productId.toString() === productId
        );

        if (cartItemIndex === -1) {
            res.status(404).send('Product not found in cart');
            return;
        }

        cart.items.splice(cartItemIndex, 1); // Remove item from cart
        await cart.save();
        res.status(200).send('Item removed from cart successfully');
    } catch (err) {
        console.error('Error removing item from cart:', err);
        res.status(500).send('Error removing item from cart');
    }
});


app.get('/user-cart/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const userCart = await Cart.findOne({ userid: userId }).populate({
            path: 'items.productId',
            model: 'Product',
            select: 'name desc src offerPrice sellingPrice' // Add fields you want to select from the Product model
        });

        if (!userCart) {
            return res.status(404).json({ message: 'Cart not found for this user' });
        }

        const cartItems = userCart.items.map(item => {
            return {
                productId: item.productId._id,
                quantity: item.quantity,
                productDetails: item.productId // Access product details directly
            };
        });

        res.json(cartItems);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});


const generateOrderID = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const seconds = now.getSeconds().toString().padStart(2, '0');
    const milliseconds = now.getMilliseconds().toString().padStart(3, '0');

    // Concatenate and create the orderId based on the timestamp
    const orderId = `${year}${month}${day}${hours}${minutes}${seconds}${milliseconds}`;

    return orderId;
};



app.post('/create-order', async (req, res) => {
    const { address, cartItems, subtotal, shipping, total, status, date, userId } = req.body;

    try {
        // Generate orderId based on timestamp
        const orderId = generateOrderID();

        // Create a new order
        const newOrder = new Order({
            orderId, // Include the generated orderId
            address,
            cartItems,
            subtotal,
            shipping,
            total,
            status,
            date,
            userId
        });

        // Save the new order to the database
        await newOrder.save();

        // Clear cart items for the respective user
        const userCart = await Cart.findOne({ userid: userId });
        if (userCart) {
            userCart.items = []; // Clear the cart items
            await userCart.save();
            res.status(200).send({ message: 'Order created successfully and cart cleared.' });
        } else {
            res.status(404).send({ message: 'Cart not found for this user.' });
        }
    } catch (err) {
        console.error('Error creating order and clearing cart:', err);
        res.status(500).send({ message: 'Error creating order and clearing cart.' });
    }
});


app.post('/orders/user', async (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const orders = await Order.find({ userId });

        if (!orders || orders.length === 0) {
            return res.status(404).json({ message: 'No orders found for this user' });
        }

        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ message: 'Error fetching orders' });
    }
});






app.post('/get-user-details', async (req, res) => {
    const { userId } = req.body;

    try {
        // Find the user based on the userId
        const user = await User.findById(userId);

        if (user) {
            // If user is found, send the user details in the response
            res.status(200).send({ user });
        } else {
            // If user is not found, send an appropriate message
            res.status(404).send({ message: 'User not found' });
        }
    } catch (err) {
        console.error('Error fetching user details:', err);
        res.status(500).send({ message: 'Error fetching user details' });
    }
});

// Route to handle /
app.get('/', (req, res) => {
    res.send('Hello, World!');
});


// Admin Routes

app.get('/orders', async (req, res) => {
    try {
        const orders = await Order.find();
        res.status(200).json(orders);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Error fetching all orders' });
    }
});

app.put('/update-order-status/:orderId', async (req, res) => {
    const { orderId } = req.params;
    const { status } = req.body;

    try {
        const order = await Order.findByIdAndUpdate(orderId, { status }, { new: true });

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        res.status(200).json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Error updating order status' });
    }
});

app.get('/products/byOrderId/:orderId', async (req, res) => {
    const { orderId } = req.params;

    try {
        // Assuming your order schema has productId(s) associated with the order
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Assuming your order schema has productId(s) associated with the order
        const products = await Product.find({ _id: { $in: order.productId } });

        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ message: 'Error fetching products' });
    }
});




// Route to fetch all products
app.get('/products/all', async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching all products:', error);
        res.status(500).json({ message: 'Error fetching all products' });
    }
});


app.post('/add-product', async (req, res) => {
    const { name, desc, src, offerPrice, sellingPrice } = req.body;
    try {
        const newProduct = new Product({
            name,
            desc,
            src,
            offerPrice,
            sellingPrice,
            offerPercentage: ((sellingPrice - offerPrice) / sellingPrice) * 100
        });
        await newProduct.save();
        res.status(201).send('Product added successfully');
    } catch (err) {
        console.error('Error adding product:', err);
        res.status(500).send('Error adding product');
    }
});

app.put('/update-product/:id', async (req, res) => {
    const productId = req.params.id;
    const { name, desc, src, offerPrice, sellingPrice } = req.body;

    try {
        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).send('Product not found');
        }

        product.name = name || product.name;
        product.desc = desc || product.desc;
        product.src = src || product.src;
        product.offerPrice = offerPrice || product.offerPrice;
        product.sellingPrice = sellingPrice || product.sellingPrice;
        product.offerPercentage = ((product.sellingPrice - product.offerPrice) / product.sellingPrice) * 100;

        await product.save();
        res.status(200).send('Product updated successfully');
    } catch (err) {
        console.error('Error updating product:', err);
        res.status(500).send('Error updating product');
    }
});

app.delete('/delete-product', async (req, res) => {
    const { productId } = req.body;

    try {
        // Check if the productId is provided in the request body
        if (!productId) {
            return res.status(400).json({ message: 'Product ID is missing in the request body' });
        }

        // Find the product by ID and delete it
        const deletedProduct = await Product.findByIdAndDelete(productId);

        // Check if the product was found and deleted
        if (!deletedProduct) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // If the product was successfully deleted
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
});




app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`);
});
