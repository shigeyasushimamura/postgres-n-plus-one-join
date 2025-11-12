import express from "express";
import {
  fetchPostsWithN1Problem,
  fetchPostsWithJoin,
} from "./queries/n-plus-one";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/posts/n-plus-one", async (req, res) => {
  try {
    const posts = await fetchPostsWithN1Problem();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/posts/optimized", async (req, res) => {
  try {
    const posts = await fetchPostsWithJoin();
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
