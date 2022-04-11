const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce');
const queryString = require('querystring');
const request = require('request-promise');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'write_products';
const forwardingAddress = process.env.NGROK_ADDR;

app.get('/', (req, res) => {
    res.send('hello world');
});

app.listen(3000, () => {
    console.log('listening to port 3000')
});
