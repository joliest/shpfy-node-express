const dotenv = require('dotenv').config();
const express = require('express');
const app = express();
const crypto = require('crypto');
const cookie = require('cookie');
const cors = require('cors');
/**
 * Don't forget to invoke nonce
 */
const nonce = require('nonce')();
const querystring = require('querystring');
const request = require('request-promise');

const apiKey = process.env.SHOPIFY_API_KEY;
const apiSecret = process.env.SHOPIFY_API_SECRET;
const scopes = 'write_products';
const forwardingAddress = process.env.NGROK_ADDR;
const frontEndAddress = process.env.FRONT_END_ADDR;
app.use(cors());
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
        // res.send({ installUrl });
        res.redirect(installUrl)
    } else {
        return res.status(400)
            .send('Missing shop parameter. Please add ?shop=your-shop to your request.');
    }
});

app.get('/shopify/callback', (req, res) => {
    /** Query parameters that Shopify will send to us */
    const { shop, hmac, code, state } = req.query;

    /** decrypt cookie in real world */
    const stateCookie = cookie.parse(req.headers.cookie).state;

    /** state from /shopify should match the state here **/
    if (state !== stateCookie) {
        return res.status(403).send('Request origin cannot be verified');
    }

    if (shop && hmac && code) {
        /**
         * hmac validation
         * We need to calculate a signature using the query params we received
         * To validate the signature, it should match the one Shopify provided
         */
        const map = Object.assign({}, req.query);
        delete map['hmac'];
        const message = querystring.stringify(map);
        const generatedHash = crypto
            .createHmac('sha256', apiSecret)
            .update(message)
            .digest('hex');

        if(generatedHash !== hmac) {
            return res.status(400).send('HMAC validation failed!');
        }

        /**
         * Calling an API / Making an API request.
         * Request URL should be https
         */
        const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
        const accessTokenPayload = {
            client_id: apiKey,
            client_secret: apiSecret,
            code,
        }

        // redirect back to front end landing page
        res.redirect(frontEndAddress)

        // request.post(accessTokenRequestUrl, { json: accessTokenPayload })
        //     .then((accessTokenResponse) => {
        //         const accessToken = accessTokenResponse.access_token;
        //
        //         /** Basic API call */
        //         const apiRequestUrl = `https://${shop}/admin/products.json`;
        //         const shopRequestHeader = {
        //             'X-Shopify-Access-Token': accessToken,
        //         }
        //         request.get(apiRequestUrl, { headers: shopRequestHeader })
        //             .then((apiResponse) => {
        //                 res.end(apiResponse)
        //             })
        //             .catch((error) => {
        //                 res.status(error.statusCode).send(error.error.errors)
        //             })
        //     })
        //     .catch((e) => {
        //         res.status(e.statusCode).send(e.error.errors);
        //     })
    } else {
        res.status(400).send('Required parameters missing.');
    }
});

app.listen(8080, () => {
    console.log('listening to port 8080')
});
