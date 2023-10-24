const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.rve683o.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const allPlayers = client.db("BlackStars").collection("AllPlayers");
    const usersCollection = client.db("BlackStars").collection("users");

    app.get("/allPlayers", async (req, res) => {
      const result = await allPlayers.find().sort({ PTS: -1 }).toArray();
      console.log(result);
      res.send(result);
    });

    app.get("/allPlayers/:id", async (req, res) => {
      const id = req.params.id;
      const result = await allPlayers.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    app.get("/users",  async (req, res) => {
      const user = await usersCollection.find().toArray();
      res.send(user);
    });

    app.post("/users", async (req, res) => {
      const users = req.body;

      const queary = { email: users.email };
      const existingEmail = await usersCollection.findOne(queary);
      console.log("existing User", existingEmail);
      if (existingEmail) {
        return res.send({ message: "user allready added" });
      }
      const result = await usersCollection.insertOne(users);
      res.send(result);
    });

    app.patch("/updatePlayer/:id", async (req, res) => {
      const id = req.params.id; // Extract the player's _id from the URL
      const updateData = req.body;
      console.log(id, updateData);

      try {
        // Update the player's details based on their _id
        const currentPlayer = await allPlayers.findOne({
          _id: new ObjectId(id),
        });

        updateData.PL = (currentPlayer.PL || 0) + 1;

        let winCounter = currentPlayer.winCounter || 0;
        let drawCounter = currentPlayer.drawCounter || 0;
        let loseCounter = currentPlayer.loseCounter || 0;

        // Determine 'PTS' based on the match result
        if (updateData.MatchResult === "Win") {
          winCounter += 1;
          if (updateData.category === "Community") {
            updateData.PTS = (currentPlayer.PTS || 0) + 15;
          } else if (updateData.category === "Non-Community") {
            updateData.PTS = (currentPlayer.PTS || 0) + 10;
          } else if (updateData.category === "Intra-Club") {
            updateData.PTS = (currentPlayer.PTS || 0) + 5;
          }
        } else if (updateData.MatchResult === "Draw") {
          drawCounter += 1;
          if (updateData.category === "Community") {
            updateData.PTS = (currentPlayer.PTS || 0) + 8;
          } else if (updateData.category === "Non-Community") {
            updateData.PTS = (currentPlayer.PTS || 0) + 5;
          } else if (updateData.category === "Intra-Club") {
            updateData.PTS = (currentPlayer.PTS || 0) + 3;
          }
        } else {
          loseCounter += 1;
          updateData.PTS = currentPlayer.PTS || 0;
        }

        updateData.winCounter = winCounter;
        updateData.drawCounter = drawCounter;
        updateData.loseCounter = loseCounter;

        const result = await allPlayers.updateOne(
          { _id: new ObjectId(id) }, // Provide a filter to identify the document to update
          { $set: updateData } // The update data
        );
      
        res.send({ result });
      } catch (err) {
        res.status(500).json({ error: "Internal server error" });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Black Stars is runing");
});

app.listen(port, (req, res) => {
  console.log("Black Stars is sitting on port", port);
});
