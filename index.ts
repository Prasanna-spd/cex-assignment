import express from "express";
import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { authmiddleware } from "./authmiddleware/middleware";
import jwt from "jsonwebtoken";

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
});

type Asset = {
  available: number;
  locked: number;
};

type Wallet = {
  INR: Asset;
} & Record<string, Asset>;

const BALANCES: Record<string, Wallet> = {
  "1": {
    INR: { available: 100, locked: 0 },
    AXIS: { available: 100, locked: 0 },
  },
};
const ORDERBOOK = {
  AXIS: { bids: {}, asks: {} },
  HDFC: { bids: {}, asks: {} },
  ICICI: { bids: {}, asks: {} },
  TATA: { bids: {}, asks: {} },
};

// POST Routes

app.post("/signup", async (req, res) => {

  const username = req.body.username;
  const password = req.body.password;

  const userExists = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (userExists) {
    return res.status(409).json({
      message: "User with this username already exists",
    });
  }

  const hashedpassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      username,
      password: hashedpassword,
    },
  });

  BALANCES[user.id]={
    INR:{
      available:0,
      locked:0
    }
  }

  return res.status(201).json({
    message: "User created successfully",
    userId: user.id,
  });
});

app.post("signin", async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  const userExists = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!userExists) {
    return res.status(404).json({
      message: "User not found",
    });
  }
  const validPassword = await bcrypt.compare(password, userExists.password);
  if (!validPassword) {
    return res.status(401).json({
      message: "Incorrect password",
    });
  }

  const token = jwt.sign(
    {
      userId: userExists.id,
    },
    "mynameisamarakbaranthony",
  );

  res.json({
    token,
  });
});

app.post("/order", authmiddleware, async (req: any, res) => {
  const userId = req.userId;
  const side = req.body.side;
  const type = req.body.type;
  const symbol = req.body.symbol;
  const price = req.body.price;
  const qty = req.body.qty;

  const userBalance = BALANCES[userId];
  if (!userBalance) {
    return res.status(404).json({
      message: "User balance not found",
    });
  }

  const asset = userBalance[symbol];
  if (!asset) {
    return res.status(404).json({
      message: "User asset not found",
    });
  }

  if (side === "BUY") {
    if (userBalance.INR.available < price * qty) {
      return res.status(411).json({
        message: "Insufficient account Balance",
      });
    } else {
      const available = userBalance.INR.available;
      userBalance.INR.available = available - price * qty;
      userBalance.INR.locked = price * qty;
    }
  } else if (side === "SELL") {
    if (asset.available < qty) {
      return res.status(404).json({
        message: "Insufficient stock balance",
      });
    } else {
      const availableStock = asset.available;
      asset.available = availableStock - qty;
      asset.locked = qty;
    }
  }
});

// GET Routes

// Put Routes

app.listen(3000, () => {
  console.log("listening on port 3000");
});


/*


now incase of buy we checked the balance and locked it in locked property 

for sell we checked the balance for stock and locked the stock in locked property



now for matching we need to write a logic 
1. that once buy is placed we will check the other side of the orderbook and find the match 
2. if sell is placed we will check the bid side of the orderbook and find match 

now if match is not found we will make them sit in orderbook

now if match is found we will do the following
1. match the order update the order book
2. update the users mooney balance or stock balance
3. update the users stock locked value or money locked value
4. update the fills table according to the maker and taker entry

now if there is a partial match we will do the following
1. match the order and update the orderbook
2. update the users money balance or stock balance
3. update the users stoock locked value or money locked value
4. update the fills table accordingly
5. for the rest of the unfilled orders the user sits on the orderbook


















*/