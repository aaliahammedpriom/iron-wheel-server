const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const port = process.env.PORT || 3000;

// dotenv config
require('dotenv').config();

// middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173','https://iron-wheel.firebaseapp.com','https://iron-wheel.web.app/'],
  credentials: true,
}));
app.use(cookieParser());

const verifytoken = (req, res, next) => {
  const token = req.cookies.token
  console.log("token from verifytoken middleware",token)
  if (!token) {
    return res.status(401).send({ message: 'Unauthorized access' })
  }
  jwt.verify(token, process.env.JWT_Secret, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "Unauthorized Access" })
    }
    req.user = decoded;
    // console.log(req.user)
    next();
  })
}


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.user_DB}:${process.env.user_Pass}@cluster0.5dnt8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // Auth Related Api
    // jwt get token
    app.post('/jwt',async(req, res)=>{
      const user =req.body;
      // console.log(user)
      const token = jwt.sign(user, process.env.jwt_Secret,{expiresIn: '1h'})
      // console.log(token)

      res
      .cookie('token', token,{
        httpOnly:true,
        secure:false,
        // sameSite: 'strict'
      })
      .send({success: true})

    })
    // jwt remove token
    app.post('/logout', async(req, res)=>{
      res.clearCookie('token',{
        httpOnly:true,
        secure:false,
      })
      .send({success:true})
    })
    
    // service related apis
    const serviceCollection = client.db('services_DB').collection('services')
    const bookedServiceCollection = client.db('services_DB').collection('booked_Services')

    // all services public
    app.get('/services', async (req, res) => {
      const loginEmail = req.query.email;
      let query = {}
      if (loginEmail) {
        query = { 'serviceProvider.email': loginEmail }
      }
      const cursor = serviceCollection.find(query);
      const result = await cursor.toArray();
      
      res.send(result)
    })
    // single service private
    app.get('/services/:id',verifytoken, async (req, res) => {
      const id = req.params.id;
      // console.log(id)
      const query = { _id: new ObjectId(id) };

      // console.log(query)

      const result = await serviceCollection.findOne(query);
      // console.log(result)

      res.send(result)
    })
    // srevice post private
    app.post(`/services`,verifytoken, async (req, res) => {
      const newService = req.body;
      // console.log(newService);
      const result = await serviceCollection.insertOne(newService)
      res.send(result)
    })
    // put service private
    app.put('/services/:id',verifytoken, async (req, res) => {
      const id = req.params.id;
      const updateService = req.body;
      // console.log(updateService)
      const filter = { _id: new ObjectId(id) }; // Filter for the service to update
      const options = { upsert: true }; // If no matching document is found, create a new one

      const service = {
        $set: {
          serviceProvider: {
            name: updateService.providerName,
            email: updateService.email,
            image: updateService.providerImage,
            location: updateService.location
          },
          service: {
            image: updateService.image,
            name: updateService.name,
            description: updateService.description,
            providerImage: updateService.providerImage,
            providerName: updateService.providerName,
            price: {
              min: updateService.min,
              max: updateService.max,
              currency: updateService.currency
            } 
          },
        },
      };
      // console.log(service)

      const result = await serviceCollection.updateOne(filter, service, options);
      // console.log(result)

      res.send(result);


    });
    // delete service private
    app.delete('/services/:id',verifytoken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await serviceCollection.deleteOne(query)
      res.send(result)
    })

    // book service related apis

    // booked service get private
    app.get('/booked-services',verifytoken, async (req, res) => {
      const email = req.query.email;
      const query = { userEmail: email }

      if (req.user.email !== email) {
        return res.status(403).send({message:"Forbidden Access"})
      }
      const result = await bookedServiceCollection.find(query).toArray()
      // agregate data
      for (const service of result) {
        const query = { _id: new ObjectId(service.serviceId) }
        const serviceResult = await serviceCollection.findOne(query)
        if (serviceResult) {
          service.service = serviceResult.service;
          service.serviceProvider = serviceResult.serviceProvider;
        }
      }
      // console.log(email)
      // console.log(provideremail)
      // console.log(query)
      res.send(result)
    })
    
    
    // booked service post private
    app.post('/booked-services',verifytoken, async (req, res) => {
      const bookedService = req.body;
      // console.log(bookedService)
      const result = await bookedServiceCollection.insertOne(bookedService);

      // use aggrigate
      const id = bookedService.serviceId;
      const query = { _id: new ObjectId(id) }
      const service = await serviceCollection.findOne(query);
      // console.log(service)
      let count = 0;
      if (service.serviceCount) {
        count = service.serviceCount + 1
      }
      else {
        count = 1
      }
      // now update job info
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          serviceCount: count
        }
      }
      const updateResult = await serviceCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // manage to do service get private
    app.get('/manage-todo-services',verifytoken, async (req, res) => {
      
      const result = await bookedServiceCollection.find().toArray()
      // agregate data
      for (const service of result) {
        const query = { _id: new ObjectId(service.serviceId) }
        const serviceResult = await serviceCollection.findOne(query)
        if (serviceResult) {
          service.service = serviceResult.service;
          service.serviceProvider = serviceResult.serviceProvider;
        }
      }
      // console.log(email)
      // console.log(provideremail)
      // console.log(query)
      res.send(result)
    })

    // book service patch private
    app.patch(`/booked-services/:id`,verifytoken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      // console.log(id, data)
      const filter = { _id: new ObjectId(id) }
      const upadatedDoc = {
        $set: {
          serviceStatus: data.status
        }
      }
      const result = await bookedServiceCollection.updateOne(filter, upadatedDoc);
      res.send(result)
    })


  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
  res.send("Iron Service Server is Running")
})
app.listen(port, () => {
  console.log("server is running on port : ", port)
})
