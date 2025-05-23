require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
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
    const gamesCollection = client.db("PlayGrid_DB").collection("all-games");
    const upcomingGamesCollection = client
      .db("PlayGrid_DB")
      .collection("upcoming-games");
    const newsCollection = client.db("PlayGrid_DB").collection("news");
    const upcomingNewsCollection = client
      .db("PlayGrid_DB")
      .collection("upcoming-news");

    // ............Game related APIs.............
    // Load all games
    app.get("/all-games", async (req, res) => {
      const sort = req.query.sort;
      const search = req.query.search;
      let sortQuery = {};
      let query = {};
      // if (sort == "true") {
      //   sortQuery = { expireDate: -1 };
      // }
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      const cursor = gamesCollection.find(query).sort(sortQuery);
      const result = await cursor.toArray();
      res.send(result);
    });
    // Load Upcoming Games
    app.get("/upcoming-games", async (req, res) => {
      const cursor = upcomingGamesCollection.find().limit(5);
      const result = await cursor.toArray();
      res.send(result);
    });
    // load category games
    app.get("/category-games", async (req, res) => {
      const cursor = gamesCollection.find().limit(5);
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
    // Add a new game
    app.post("/all-games", async (req, res) => {
      const newGame = req.body;
      const result = await gamesCollection.insertOne(newGame);
      res.send(result);
    });
    // Count Total Games
    app.get("/games-count", async (req, res) => {
      const count = await gamesCollection.estimatedDocumentCount();
      res.send({ count });
    });

    // .............News related APIs.............
    // Load all news
    app.get("/all-news", async (req, res) => {
      const currentPage = parseInt(req.query.page);
      const itemsPerPage = parseInt(req.query.size);
      const skipItems = (currentPage - 1) * itemsPerPage;

      const result = await newsCollection
        .find()
        .skip(skipItems)
        .limit(itemsPerPage)
        .toArray();
      res.send(result);
    });
    // Load Upcoming News
    app.get("/upcoming-news", async (req, res) => {
      const cursor = upcomingNewsCollection.find().limit(4);
      const result = await cursor.toArray();
      res.send(result);
    });
    // load latest news
    app.get("/latest-news", async (req, res) => {
      const cursor = newsCollection.find().limit(3);
      const result = await cursor.toArray();
      res.send(result);
    });
    // load specific news
    app.get("/news/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await newsCollection.findOne(query);
      res.send(result);
    });
    // Count Total News
    app.get("/news-count", async (req, res) => {
      const count = await newsCollection.estimatedDocumentCount();
      res.send({ count });
    });
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
