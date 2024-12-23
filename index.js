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

    // all services
    app.get('/services', async(req, res)=>{
        const cursor = serviceCollection.find();
        const result = await cursor.toArray();
        res.send(result)
    })
    // single service
    app.get('/services/:id', async (req, res) => {
        const id = req.params.id;
        console.log(id)
        const query = { _id: id };

        console.log(query)

        const result = await serviceCollection.findOne(query);
        console.log(result)

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
