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
    // await client.connect();
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Collection Names
    const gamesCollection = client.db("PlayGrid_DB").collection("all-games");
    const newsCollection = client.db("PlayGrid_DB").collection("news");
    const upcomingNewsCollection = client
      .db("PlayGrid_DB")
      .collection("upcoming-news");
    const usersCollection = client.db("PlayGrid_DB").collection("users");

    // ............Game related APIs.............
    // Load all games
    app.get("/all-games", async (req, res) => {
      const { search, genre, feature, platform, price } = req.query;
      let query = {};

      // Search filter
      if (search) {
        query.name = { $regex: search, $options: "i" };
      }

      // Genre filter (multiple possible)
      if (genre) {
        const genresArray = genre.split(",").map((g) => g.trim());
        query.genres = { $in: genresArray };
      }

      // Feature filter
      if (feature) {
        const featureArray = feature.split(",").map((f) => f.trim());
        query.features = { $in: featureArray };
      }

      // Platform filter
      if (platform) {
        const platformArray = platform.split(",").map((p) => p.trim());
        query.platform = {
          $in: platformArray.map((p) => new RegExp(p, "i")),
        };
      }

      // Price range filter (example logic)
      if (price) {
        const priceArray = price.split(",");
        let priceConditions = [];

        priceArray.forEach((range) => {
          if (range === "Free") {
            priceConditions.push({ offerPrice: 0 });
          } else if (range === "$1 - $20") {
            priceConditions.push({ offerPrice: { $gte: 1, $lte: 20 } });
          } else if (range === "$21 - $40") {
            priceConditions.push({ offerPrice: { $gte: 21, $lte: 40 } });
          } else if (range === "$41 - $60") {
            priceConditions.push({ offerPrice: { $gte: 41, $lte: 60 } });
          } else if (range === "$61 and Higher") {
            priceConditions.push({ offerPrice: { $gte: 61 } });
          }
        });

        if (priceConditions.length > 0) {
          query.$or = priceConditions;
        }
      }

      const projection = {
        name: 1,
        rating: 1,
        regularPrice: 1,
        offerPrice: 1,
        poster: 1,
        developer: 1,
      };

      try {
        const result = await gamesCollection
          .find(query, { projection })
          .toArray();
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });

    // load specific game
    app.get("/game/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await gamesCollection.findOne(query);
      res.send(result);
    });

    // load category games
    app.get("/most-popular-games", async (req, res) => {
      const result = await gamesCollection
        .find()
        .sort({ rating: -1 })
        .limit(10)
        .toArray();

      res.send(result);
    });
    app.get("/new-release-games", async (req, res) => {
      const result = await gamesCollection
        .find()
        .sort({ releaseDate: -1 })
        .limit(10)
        .toArray();

      res.send(result);
    });
    app.get("/explore-new-games", async (req, res) => {
      const result = await gamesCollection
        .aggregate([
          {
            $addFields: {
              screenshotsCount: { $size: "$screenshots" },
            },
          },
          {
            $sort: { screenshotsCount: 1 }, // ascending → lowest first
          },
          {
            $limit: 10,
          },
        ])
        .toArray();

      res.send(result);
    });

    // load related games by genre
    app.get("/related-games", async (req, res) => {
      const id = req.query.id;
      const game = await gamesCollection.findOne({
        _id: new ObjectId(id),
      });
      const genres = game.genres;

      const relatedGames = await gamesCollection
        .find({
          genres: { $in: genres },
          _id: { $ne: new ObjectId(id) },
        })
        .limit(5)
        .toArray();

      res.send(relatedGames);
    });

    // Add a new game
    app.post("/all-games", async (req, res) => {
      const newGame = req.body;
      const result = await gamesCollection.insertOne(newGame);
      res.send(result);
    });

    // post game reviews
    app.patch("/post-reviews", async (req, res) => {
      const { gameId, newReview } = req.body;

      const result = await gamesCollection.updateOne(
        { _id: new ObjectId(gameId) },
        { $push: { reviews: newReview } }
      );

      res.send(result);
    });

    // .............News related APIs.............
    // Load all news
    app.get("/all-news", async (req, res) => {
      const currentPage = parseInt(req.query.page);
      const itemsPerPage = parseInt(req.query.size);
      const skipItems = (currentPage - 1) * itemsPerPage;
      const searchQuery = req.query.search;
      const genreQuery = req.query.genre;
      const query = {};

      // Sort by Search
      if (searchQuery) {
        query.title = { $regex: searchQuery, $options: "i" };
      }
      // Sort by Genre
      if (genreQuery) {
        const genreList = genreQuery.split(",");
        query.category = { $in: genreList };
      }

      const total = await newsCollection.countDocuments(query);

      const result = await newsCollection
        .find(query)
        .skip(skipItems)
        .limit(itemsPerPage)
        .toArray();
      res.send({ news: result, count: total });
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

    // .............USER related APIs.............

    // post a new user doc
    app.post("/new-user", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // load specific user games
    app.get("/user-gamelist", async (req, res) => {
      const email = req.query.email;
      const userDoc = await usersCollection.findOne({ email });

      const ownedGameIds = userDoc.ownedGames.map((id) => new ObjectId(id));
      const favouriteGameIds = userDoc.favourites.map((id) => new ObjectId(id));

      const ownedGames = await gamesCollection
        .find(
          { _id: { $in: ownedGameIds } },
          { projection: { _id: 1, name: 1, poster: 1 } }
        )
        .toArray();

      const favouriteGames = await gamesCollection
        .find(
          { _id: { $in: favouriteGameIds } },
          { projection: { _id: 1, name: 1, poster: 1 } }
        )
        .toArray();

      res.send({
        ownedGames,
        favouriteGames,
      });
    });

    // Update Favourite gamelist
    app.patch("/user-favourites", async (req, res) => {
      const { email, gameId } = req.body;
      const userDoc = await usersCollection.findOne({ email });
      const isFavourite = userDoc.favourites.includes(gameId);
      let result;

      if (isFavourite) {
        result = await usersCollection.updateOne(
          { email },
          { $pull: { favourites: gameId } }
        );
      } else {
        result = await usersCollection.updateOne(
          { email },
          { $addToSet: { favourites: gameId } }
        );
      }
      res.send(result);
    });

    // .......CARTLIST Realated APIs................
    // load user cart games
    app.get("/user-cartlist", async (req, res) => {
      const email = req.query.email;
      const userDoc = await usersCollection.findOne({ email });
      // convert gameID strings to ObjectId
      const cartItemIds = userDoc.cartItems.map((id) => new ObjectId(id));

      const result = await gamesCollection
        .find(
          { _id: { $in: cartItemIds } },
          {
            projection: {
              _id: 1,
              name: 1,
              poster: 1,
              regularPrice: 1,
              offerPrice: 1,
              platform: 1,
              developer: 1,
            },
          }
        )
        .toArray();
      res.send(result);
    });

    // add product in user cartlist
    app.post("/add-to-cart", async (req, res) => {
      const { email, gameId } = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $push: { cartItems: gameId } }
      );
      res.send(result);
    });

    // delete a item from cartlist
    app.patch("/delete-cartItem", async (req, res) => {
      const { email, cartItem } = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $pull: { cartItems: cartItem } }
      );
      res.send(result);
    });

    // move a cartitem to wishlist
    app.patch("/move-to-wishlist", async (req, res) => {
      const { email, gameId } = req.body;
      const user = await usersCollection.findOne({ email });

      const removeFromCart = await usersCollection.updateOne(
        { email },
        { $pull: { cartItems: gameId } }
      );

      const addToWishlist = await usersCollection.updateOne(
        { email },
        { $addToSet: { wishItems: gameId } }
      );

      res.send(removeFromCart, addToWishlist);
    });

    // Purchase game by place order
    app.patch("/purchase-game", async (req, res) => {
      try {
        const { email } = req.body;
        const user = await usersCollection.findOne({ email });

        if (!user) {
          return res.status(404).send({ error: "User not found" });
        }

        const result = await usersCollection.updateOne(
          { email },
          {
            $addToSet: { ownedGames: { $each: user.cartItems } },
            $set: { cartItems: [] },
          }
        );

        res.send(result);
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to place order" });
      }
    });

    // .......WISHLIST Realated APIs.........
    // load user wishlist
    app.get("/user-wishlist", async (req, res) => {
      const email = req.query.email;
      const userDoc = await usersCollection.findOne({ email });
      const wishItemIds = userDoc.wishItems.map((id) => new ObjectId(id));

      const result = await gamesCollection
        .find(
          { _id: { $in: wishItemIds } },
          {
            projection: {
              _id: 1,
              name: 1,
              poster: 1,
              regularPrice: 1,
              offerPrice: 1,
              platform: 1,
              developer: 1,
            },
          }
        )
        .toArray();
      res.send(result);
    });

    // Add a game in wishlist
    app.post("/add-to-wishlist", async (req, res) => {
      const { email, gameId } = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $push: { wishItems: gameId } }
      );
      res.send(result);
    });

    // delete a item from wishlist
    app.patch("/delete-wishItem", async (req, res) => {
      const { email, wishItem } = req.body;

      const result = await usersCollection.updateOne(
        { email },
        { $pull: { wishItems: wishItem } }
      );
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
