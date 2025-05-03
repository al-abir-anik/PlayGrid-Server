require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 3000;
// Middlewires
app.use(cors());
app.use(express.json());


// CONNECTION CODE START___
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@root-cluster.yqkit.mongodb.net/?retryWrites=true&w=majority&appName=root-Cluster`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Collection Names
    const gamesCollection = client.db("PlayGrid_DB").collection("all_games");
    

    
    // ............Meal related APIs.............

    // Add a new game
    app.post("/all-games", async (req, res) => {
      const newGame = req.body;
      const result = await gamesCollection.insertOne(newGame);
      res.send(result);
    });
     // load category games
     app.get("/category-games", async (req, res) => {
      const cursor = gamesCollection.find().limit(3);
      const result = await cursor.toArray();
      res.send(result);
    });
    // load specific game
    app.get("/game/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await gamesCollection.findOne(query);
      res.send(result);
    });
    // yoooo






  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Games is falling from the sky yoooooooooo");
});

app.listen(port, () => {
  console.log(`Games is waiting at ${port}`);
});
