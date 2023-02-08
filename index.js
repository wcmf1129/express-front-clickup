const express = require('express')
const app = express()
var bodyParser = require('body-parser');
var useragent = require('express-useragent');
const crypto = require('crypto');

const clickupak = process.env.clickupak;
const clickupwhs = process.env.clickupwhs;

app.use(useragent.express());
app.use(bodyParser.json());    
app.use(bodyParser.urlencoded({ extended: true }));    

app.all('/', (req, res) => {
    var ip = req.socket.remoteAddress;
    console.log("Just got a request!",ip,"param:",req.params,"body:");
    console.dir(req.body, { depth: null });
    
    res.send('Yo!')
})

app.all('/clickup-assign', (req, res) => {
    var ip = req.socket.remoteAddress;
    console.log("clickup-assign",ip,"param:",req.params,"body:");
    console.dir(req.body, { depth: null });

    console.log("X-Signature:",req.get('X-Signature'));
    var body = JSON.stringify(req.body);
    console.log("body:",body);
    const hash = crypto.createHmac('sha256', clickupwhs).update(body);
    const signature = hash.digest('hex');
    console.log("hash:",hash);
    console.log("signature:",signature);


    res.send('Yo!')
})

app.listen(process.env.PORT || 3000)