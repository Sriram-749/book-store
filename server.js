require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const bcrypt = require("bcrypt");
const session = require("express-session");
const { db } = require("./firebase-config");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use("/css", express.static(__dirname + "/public/css"));
app.use("/images", express.static(__dirname + "/public/images"));
app.use("/js", express.static(__dirname + "/public/js"));
app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60,
      httpOnly: true,
    },
  })
);

app.set("views", "./views");
app.set("view engine", "ejs");

app.get("/", (req, res) => {
  res.render("index", { user: req.session.user || null });
});

app.get("/index", (req, res) => {
  res.render("index", { user: req.session.user || null });
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", async (req, res) => {
  try {
    const { fullname, email, password, cPassword } = req.body;
    const duplicate = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    if (password !== cPassword) {
      res.json({
        status: "200",
        message: "Password and Confirm password must be same!",
      });
    }
    if (!duplicate.empty)
      res.json({ status: 409, message: "User already exists" });
    else {
      console.log(fullname + " " + email + " " + password + " " + cPassword);
      const user = await db.collection("users").add({
        name: fullname,
        email: email,
        password: await bcrypt.hash(
          password,
          parseInt(process.env.SALT_ROUNDS)
        ),
      });
      res.redirect("/login");
    }
  } catch (error) {
    res.json({ status: 500, message: `Internal server error! ${error}` });
  }
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const docSnap = await db
      .collection("users")
      .where("email", "==", email)
      .get();
    if (docSnap.empty) {
      res.json({ status: 409, message: "Inavlid credentials entered" });
    } else {
      let user;
      docSnap.forEach((doc) => {
        user = doc.data();
      });
      const compare = bcrypt.compare(password, user.password);
      if (!compare) {
        res.json({ status: 409, message: "Inavlid credentials entered" });
      } else {
        const credentials = {
          name: user.name,
          email: user.email,
          id: user.id,
          admin: user.admin,
        };
        req.session.user = credentials;
        res.redirect("/index");
      }
    }
  } catch (error) {
    console.log(error);
    res.json({ status: 500, message: `Internal server error: ${error}` });
  }
});

app.get("/logout", (req, res) => {
  req.session.user = null;
  res.redirect("/index");
});

app.get("/viewer/:isbn", (req, res) => {
  res.render("viewer", { isbn: req.params.isbn });
});

app.get("/search", async (req, res) => {
  try {
    const searchTerm = req.query.search;
    const apiKey = "AIzaSyBkW5B7CC8s5ApjcXtoEAlEyoNfnE9g6Qc";
    const url = `https://www.googleapis.com/books/v1/volumes?q=${searchTerm}&fields=items(volumeInfo(title,authors,imageLinks,industryIdentifiers,categories))&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!data.items) {
      return res.render("results", {
        books: null,
        message: "No books found!",
      });
    }
    const books = data.items.map((book) => {
      return {
        title: book.volumeInfo.title || "Title not available",
        authors: book.volumeInfo.authors
          ? book.volumeInfo.authors.join(", ")
          : "Unknown",
        image: book.volumeInfo.imageLinks
          ? book.volumeInfo.imageLinks.thumbnail
          : "/images/book.png",
        isbn10:
          book.volumeInfo.industryIdentifiers &&
          book.volumeInfo.industryIdentifiers[0]?.identifier,
        isbn13:
          book.volumeInfo.industryIdentifiers &&
          book.volumeInfo.industryIdentifiers[1]?.identifier,
        categories: book.volumeInfo.categories
          ? book.volumeInfo.categories.join(", ")
          : "Genres not available",
      };
    });
    res.render("results", { books, message: null });
  } catch (error) {
    console.error(error);
    res.render("results", { books: null, message: "An error occurred!" });
  }
});

app.get("/read/:isbn", (req, res) => {
  res.render("viewer", { isbn: req.params.isbn });
});
app.listen(3000, () => console.log("Server listening to the port 3000!"));
