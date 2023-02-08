const express = require('express')
const app = express()
app.all('/', (req, res) => {
    var ip = req.socket.remoteAddress;
    console.log(ip,"Just got a request!")
    res.send('Yo!',ip);
})
app.listen(process.env.PORT || 3000)