const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe =require('stripe')(process.env.SECRET_KEY)
const port = process.env.PORT || 5008;


// middleware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qjppvab.mongodb.net/?retryWrites=true&w=majority`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();
   const campCollection = client.db("campDb").collection("camp");
   const userCollection = client.db("campDb").collection("user");
   const contactCollection = client.db("campDb").collection("contact");
   const AddCartCollection = client.db("campDb").collection("cart");
   const paymentCollection = client.db("campDb").collection("payment");
     // jwt related api
     app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token });
    })

    // middlewares 
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }
   

   app.post('/camps', async (req, res) => {
    const camps = req.body;
    const result = await campCollection.insertOne(camps);
    res.send(result);
  });
  app.patch('/camps/:id', verifyToken, verifyAdmin, async (req, res) => {
      
    const data = req.body;
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) }
    const updatedDoc = {
      $set: {
        participant:data.participant,
        name: data.name,
        image: res.data.data.display_url,
        fees: data.fees,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        location: data.location,
        specializedServices: data.specializedServices,
        healthcareProfessionals: data.healthcareProfessionals,
        targetAudience: data.targetAudience,
        comprehensiveDescription: data.comprehensiveDescription,
      }
    }

    const result = await campCollection.updateOne(filter, updatedDoc)
    res.send(result);
  })

app.get('/camps/:id',async(req,res)=>{
  const id =req.params.id
  const query ={_id: new ObjectId(id)}
  const result =await campCollection.findOne(query)
  
  res.send(result)
})

  app.get('/camps', async (req, res) => {
    const result = await campCollection.find().toArray();
    res.send(result);
  })
  app.delete('/camps/:id',verifyToken,verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await campCollection.deleteOne(query);
    res.send(result);
  })
  app.post('/users', async (req, res) => {
    const user = req.body;
  
    const query = { email: user.email }
    const existingUser = await userCollection.findOne(query);
    if (existingUser) {
      return res.send({ message: 'user already exists', insertedId: null })
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
  });
  app.get('/users', async (req, res) => {
    const result = await userCollection.find().toArray();
    res.send(result);
  })
  app.get('/users/admin/:email',verifyToken,verifyAdmin, async (req, res) => {
    const email = req.params.email;

    if (email !== req.decoded.email) {
      return res.status(403).send({ message: 'forbidden access' })
    }

    const query = { email: email };
    const user = await userCollection.findOne(query);
    let admin = false;
    if (user) {
      admin = user?.role === 'admin';
    }
    res.send({ admin });
  })
  app.patch('/users/admin/:id',  async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'admin'
      }
    }
    const result = await userCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })

  app.delete('/users/:id',verifyToken,verifyAdmin,  async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await userCollection.deleteOne(query);
    res.send(result);
  })

  app.post('/contact', async (req, res) => {
    const contact = req.body;
    const result = await contactCollection.insertOne(contact);
    res.send(result);
  });
  app.get('/contact',verifyToken,verifyAdmin, async (req, res) => {
    const result = await contactCollection.find().toArray();
    res.send(result);
  })
  app.delete('/contact/:id',verifyToken,verifyAdmin,  async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await contactCollection.deleteOne(query);
    res.send(result);
  })
  app.get('/carts', async (req, res) => {
    const email = req.query.email;
    const query = { email: email };
    const result = await AddCartCollection.find(query).toArray();
    res.send(result);
  });

  app.post('/carts', async (req, res) => {
    const cartItem = req.body;
    const result = await AddCartCollection.insertOne(cartItem);
    res.send(result);
  });
  app.delete('/carts/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) }
    const result = await AddCartCollection.deleteOne(query);
    res.send(result);
  })
    // payment intent
    app.get('/payments/:email', verifyToken, async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })
    
    app.post('/create-payment-intent', async (req, res) => {
      const { fees } = req.body;
      const amount = parseInt(fees * 100);
      console.log(amount, 'amount inside the intent')
  
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
  
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });
  
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);
      const filter = { _id: new ObjectId(payment.campItemIds) };
      const existingCamp = await campCollection.findOne(filter);
      const currentParticipantCount = Number(existingCamp?.participant) || 0;
      const updateDoc = {
        $set: { participant: currentParticipantCount + 1 }
    };
    const participantResult = await campCollection.updateOne(filter, updateDoc);
      

    
      console.log('payment info', payment);
      const query = { _id: new ObjectId(payment.cartIds) }
    
      const deleteResult = await AddCartCollection.deleteOne(query);
    
      res.send({ paymentResult,deleteResult,participantResult}); 
    })
 
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
   // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('camp is running')
  })
  
  app.listen(port, () => {
    console.log(`Medical Camp is Running on port ${port}`);
  })
