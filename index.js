const express = require('express');
const cors = require('cors');
const app = express();
const port = 7000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require ("dotenv").config()
app.use(cors());
app.use(express.json());

const admin = require("firebase-admin");

const serviceAccount = require("./serviceKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});


const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.hlqh8iv.mongodb.net/?appName=Cluster0`;
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const middleware =async (req,res,next)=>{
 const authorization= req.headers.authorization
  const token =authorization.split(' ')[1]


  try{
     await admin.auth().verifyIdToken(token)
       next()
  }
  catch(error){
    res.status(401).send({
      message:"unauthorised access."
    })
  }

}

async function run() {
  try {
    //await client.connect();
    const db = client.db('habit-tracker');
    const habitCollection = db.collection('AddHabit');
    app.get('/addHabit', async (req, res) => {
      const result = await habitCollection.find().toArray();
      res.send(result);
    });


     app.get("/latest-habit", async (req, res) => {
      const result = await habitCollection
        .find().sort({createdAt: "desc"}).limit(6).toArray();
        console.log(result);
        res.send(result);
    });
    app.get('/addHabit/:id',middleware, async (req, res) => {
      const { id } = req.params;
      const result = await habitCollection.findOne({ _id: new ObjectId(id) });
      res.send({ success: true, result });
    });
    app.post('/addHabit', async (req, res) => {
      const habitData = req.body;
      const result = await habitCollection.insertOne(habitData);
      res.send(result);
    });
    app.patch('/addHabit/:id', async (req, res) => {
      const { id } = req.params;
      const updateData = req.body;

      const updatedHabit = await habitCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateData },
        { returnDocument: 'after' }
      );
      res.send({ success: true, result: updatedHabit.value });
    });
    app.delete('/addHabit/:id', async (req, res) => {
      const { id } = req.params;
      const deleted = await habitCollection.deleteOne({ _id: new ObjectId(id) });
      if (deleted.deletedCount === 1) {
        res.send({ success: true, message: "Habit deleted successfully" });
      } else {
        res.status(404).send({ success: false, message: "Habit not found" });
      }
    });
    app.patch('/addHabit/:id/complete', async (req, res) => {
      try {
        const { id } = req.params;
        const { completionHistory } = req.body;

        const habit = await habitCollection.findOne({ _id: new ObjectId(id) });
        if (!habit) return res.status(404).send({ success: false, message: "Habit not found" });

        const todayStr = new Date().toDateString();
        const historyStrings = completionHistory.map(d => new Date(d).toDateString());
        if (
          historyStrings.includes(todayStr) &&
          habit.completionHistory?.map(d => new Date(d).toDateString()).includes(todayStr)
        ) {
          return res.status(400).send({ success: false, message: "Habit already completed today" });
        }

        const sortedHistory = [...historyStrings].sort((a, b) => new Date(b) - new Date(a));
        let streak = 0;
        let dayCounter = 0;
        for (let i = 0; i < sortedHistory.length; i++) {
          const date = new Date();
          date.setDate(date.getDate() - dayCounter);
          if (sortedHistory.includes(date.toDateString())) streak++;
          else break;
          dayCounter++;
        }

        const updatedHabit = await habitCollection.findOneAndUpdate(
          { _id: new ObjectId(id) },
          { $set: { completionHistory, currentStreak: streak } },
          { returnDocument: 'after' }
        );

        res.send({ success: true, result: updatedHabit.value });
      } catch (error) {
        console.error(error);
        res.status(500).send({ success: false, message: "Server error" });
      }
    });

    //await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB successfully!");
  } finally {
    // client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => res.send('Server is running'));

const users = [
  { id: 1, name: 'Sabana', email: 'sabana@gmail.com' },
  { id: 2, name: 'Safa', email: 'safa@gmail.com' },
  { id: 3, name: 'Sabila', email: 'sabila@gmail.com' },
];
app.get('/users', (req, res) => res.send(users));
app.post('/users', (req, res) => {
  const newUser = req.body;
  newUser.id = users.length + 1;
  users.push(newUser);
  res.send(newUser);
});
app.listen(port, () => console.log(`Server listening on port ${port}`));

