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

app.get('/shopify', (req, res) => {
    const shop = req.query.shop;
    if (shop) {
        /**
         * What is nonce for?
         *      ↳ random string that nonce will take care for us. We send it as request
         *      once we receive the response from Shopify, it will echo the state so that we can
         *      compare the two.
         *           ↳ if they match - it came from shopify
         *           ↳ if they dont match - it is invalid and returns an error
         */
        const state = nonce();
        const redirectUri = `${forwardingAddress}/shopify/callback`;
        /**
         * @type {string}
         * Needs the following
         *     → Path Variable
         *          ↳ shop
         *     → Query Parameters
         *          ↳ client_id
         *          ↳ scope
         *          ↳ state
         *          ↳ redirectUri
         */
        const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${apiKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;

        /**
         * Should be encrypted in real world
         */
        res.cookie('state', state);
        res.redirect(installUrl);
    } else {
        return res.status(400)
            .send('Missing shop parameter. Please add ?shop=your-shop to your request.');
    }
});

app.listen(3000, () => {
    console.log('listening to port 3000')
});
