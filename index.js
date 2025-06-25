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
    const userGamesCollection = client
      .db("PlayGrid_DB")
      .collection("user-owned-games");
    const userWishlistCollection = client
      .db("PlayGrid_DB")
      .collection("user-wishlist");

    // ............Game related APIs.............
    // Load all games
    app.get("/all-games", async (req, res) => {
      const search = req.query.search;
      const priceOrder = req.query.priceOrder;
      const genre = req.query.genre;
      const priceRange = req.query.priceRange;
      let query = {};
      let sortQuery = {};

      // Sort by Search
      if (search) {
        query.title = { $regex: search, $options: "i" };
      }
      // Sort by Price Order
      if (priceOrder === "low to high") {
        sortQuery.price = 1;
      } else if (priceOrder === "high to low") {
        sortQuery.price = -1;
      }
      // Sort by Genre
      if (genre) {
        const genreArray = genre.split(",").map((g) => g.trim());
        query.genre = { $in: genreArray };
      }
      // Sort by Price range
      if (priceRange === "Free") {
        query.price = 0;
      } else if (priceRange === "$0 - $20") {
        query.price = { $lte: 20 };
      } else if (priceRange === "$21 - $40") {
        query.price = { $lte: 40 };
      } else if (priceRange === "$41 - $60") {
        query.price = { $lte: 60 };
      } else if (priceRange === "$61 and Higher") {
        query.price = { $gt: 60 };
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
      const cursor = gamesCollection.find().limit(7);
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
      const cursor = newsCollection.find().limit(2);
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

    // .............USER related APIs.............
    // load specific user games
    app.get("/user-gamelist", async (req, res) => {
      const email = req.query.email;
      const userDoc = await userGamesCollection.findOne({ email });

      const purchasedIds =
        userDoc.purchased.map((p) => new ObjectId(p.gameId)) || [];
      const favouritesIds =
        userDoc.favourites.map((id) => new ObjectId(id)) || [];

      const purchasedGames = await gamesCollection
        .find({ _id: { $in: purchasedIds } })
        .toArray();
      const favouriteGames = await gamesCollection
        .find({ _id: { $in: favouritesIds } })
        .toArray();

      res.send({ purchasedGames, favouriteGames });
    });
    // Update Favourite gamelist
    app.patch("/user-gamelist", async (req, res) => {
      const { email, gameId } = req.body;
      const userDoc = await userGamesCollection.findOne({ email });
      const isFavourite = userDoc.favourites.includes(gameId);
      let result;

      if (isFavourite) {
        result = await userGamesCollection.updateOne(
          { email },
          { $pull: { favourites: gameId } }
        );
      } else {
        result = await userGamesCollection.updateOne(
          { email },
          { $addToSet: { favourites: gameId } }
        );
      }
      res.send(result);
    });
    // load specific user wishlist
    app.get("/user-wishlist", async (req, res) => {
      const email = req.query.email;
      const userDoc = await userWishlistCollection.findOne({ email });
      const wishlistGameIds =
        userDoc.gameIds.map((id) => new ObjectId(id)) || [];

      const result = await gamesCollection
        .find({ _id: { $in: wishlistGameIds } })
        .toArray();
      res.send(result);
    });
    // delete game from user wishlist
    app.patch("/user-gamelist", async (req, res) => {
      const { email, gameId } = req.body;
      const userDoc = await userGamesCollection.findOne({ email });
      const isFavourite = userDoc.favourites.includes(gameId);

      let result;

      if (isFavourite) {
        result = await userGamesCollection.updateOne(
          { email },
          { $pull: { favourites: gameId } }
        );
      } else {
        result = await userGamesCollection.updateOne(
          { email },
          { $addToSet: { favourites: gameId } }
        );
      }
      res.send(result);
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
