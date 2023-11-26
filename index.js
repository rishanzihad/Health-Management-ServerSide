const express = require('express');
const app = express();
const cors = require('cors');

require('dotenv').config()
const port = process.env.PORT || 5008;


// middleware
app.use(cors());
app.use(express.json());


app.get('/', (req, res) => {
  res.send('camp is running')
})

app.listen(port, () => {
  console.log(`Medical Camp is Running on port ${port}`);
})