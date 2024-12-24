const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// dotenv config
require('dotenv').config();

// middleware
app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = "mongodb+srv://aaliahammedpriom66:YuTKjTdm9SMc4r2U@cluster0.5dnt8.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
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
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");

    // service related apis
    const serviceCollection = client.db('services_DB').collection('services')
    const bookedServiceCollection = client.db('services_DB').collection('booked_Services')

    // all services
    app.get('/services', async(req, res)=>{
      const loginEmail = req.query.email;
      let query ={}
      if(loginEmail){
        query ={'serviceProvider.email' : loginEmail}
      }
        const cursor = serviceCollection.find(query);
        const result = await cursor.toArray();
        res.send(result)
    })
    // single service
    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id)
        const query = {_id : new ObjectId(id)};

        // console.log(query)

        const result = await serviceCollection.findOne(query);
        // console.log(result)

        res.send(result)
      })
      // srevice post
      app.post(`/services`, async(req,res)=>{
        const newService =req.body;
        // console.log(newService);
        const result =await serviceCollection.insertOne(newService)
        res.send(result)
      })

      // book service related apis

      // booked service get
      app.get('/booked-services', async(req,res)=>{
        const email = req.query.email;
        const provideremail =req.query.provideremail;
        let query ={}
        if(email){
         query ={ userEmail: email}
        }
        if(provideremail){
          query ={"serviceProvider.email" : provideremail}

        }
        const result = await bookedServiceCollection.find(query).toArray()
        // agregate data
        for(const service of result){
          const query = {_id : new ObjectId(service.serviceId)}
          const serviceResult = await serviceCollection.findOne(query)
          if(serviceResult){
            service.service = serviceResult.service;
            service.serviceProvider = serviceResult.serviceProvider;
          }
        }
        console.log(email)
        console.log(provideremail)
        console.log(query)
        res.send(result)
      })
      // booked service post
      app.post('/booked-services', async(req,res)=>{
        const bookedService = req.body;
        // console.log(bookedService)
        const result = await bookedServiceCollection.insertOne(bookedService);

        // use aggrigate
        const id =bookedService.serviceId;
        const query = {_id : new ObjectId(id)}
        const service = await serviceCollection.findOne(query);
        // console.log(service)
        let count  = 0;
        if(service.serviceCount){
          count = service.serviceCount+1
        }
        else{
          count  = 1
        }
        // now update job info
        const filter = {_id : new ObjectId(id)};
        const updatedDoc ={
          $set :{
            serviceCount: count
          }
        }
        const updateResult = await serviceCollection.updateOne(filter, updatedDoc)
        res.send(result)
      })

      // book service patch
      app.patch(`/booked-services/:id`, async(req,res)=>{
        const id = req.params.id;
        const data = req.body;
        // console.log(id, data)
        const filter = {_id : new ObjectId(id)}
        const upadatedDoc ={ 
          $set:{
            serviceStatus:  data.status
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


app.get('/', async(req, res)=>{
    res.send("Iron Service Server is Running")
})
app.listen(port, ()=>{
    console.log("server is running on port : " ,port)
})
