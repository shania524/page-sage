
//jshint esversion:6
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const path = require('path');
const Book = require("./models/book");

const session = require("express-session");

const app = express();

app.use(session({
  secret: "your-secret-key", // Replace with your own secret key
  resave: false,
  saveUninitialized: true
}));

mongoose.set('strictQuery', true);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates', 'views'));

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true });


mongoose.connection.once("open", async () => {
  try {
    const indexExists = await Book.collection.indexExists("title_text_description_text");
    console.log("Text index exists:", indexExists);

    if (!indexExists) {
      await Book.createIndexes();
      console.log("Text index created successfully");
    }
  } catch (error) {
    console.error("Error checking or creating text index:", error);
  }
});



app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));


const userSchema = new mongoose.Schema({
  username: String,
  password: String, // Remove the 'select: false' option to include the password field when querying the database
  cart: [{ book: { type: mongoose.Schema.Types.ObjectId, ref: 'Book' }, dueDate: Date }]
});

const User = mongoose.model("User", userSchema);

app.get("/", function (req, res) {
  res.render("index");
});

app.get("/login", function (req, res) {
  res.render("login");
});

app.get("/register", function (req, res) {
  res.render("register");
});

app.get("/branch", function (req, res) {
  res.render("branch",{currentPage: 'page1'});
});

// app.get("/branch/:branch", async function (req, res) {
//   console.log(req.session.user);
//   const branch = req.params.branch;
//   const user = req.session.user;

//   try {
//     const books = await Book.find({ branch: branch });
//     res.render("books", { books: books, branch: branch, user: user ,currentPage: 'page2' });
//   } catch (err) {
//     console.error(err);
//     res.render("error", { errorMessage: "An error occurred" });
//   }
// });
// app.get("/branch/:branch", async function (req, res) {
//   try {
//     console.log(req.session.user);
//     const branch = req.params.branch;
//     const user = req.session.user;

//     const books = await Book.find({ branch: branch }).exec();
//     res.render("books", { books: books, branch: branch, user: user, currentPage: 'page2' });
//   } catch (err) {
//     console.error(err);
//     res.render("error", { errorMessage: "An error occurred" });
//   }
// });
app.get("/branch/:branch", async function (req, res) {
  try {
    const branch = req.params.branch;
    const user = req.session.user;
    const query = req.query.query; // Get the search query from the URL query parameters

    let books;

    // Check if the text index exists
    const indexExists = await Book.collection.indexExists("title_text_description_text");

    if (!indexExists) {
      // If the text index doesn't exist, create it
      await Book.createIndexes();
      console.log("Text index created successfully");
    }

    if (query) {
      // If there is a search query, search for books matching the query in the specified branch
      // books = await Book.find({ branch: branch, $text: { $search: query } }).exec();
      books = await Book.find({ branch: branch, $text: { $search: `"${query}"` } }).exec();

    } else {
      // If no search query, fetch all books in the specified branch
      books = await Book.find({ branch: branch }).exec();
    }

    res.render("books", { books: books, branch: branch, user: user, currentPage: 'page2' });
  } catch (err) {
    console.error(err);
    res.render("error", { errorMessage: "An error occurred" });
  }
});

app.use(function (err, req, res, next) {
  console.error(err);
  res.render("error", { errorMessage: err.message });
});


app.post("/branch/:branch/add-to-cart", function (req, res) {
  const branch = req.params.branch;
  const bookId = req.body.bookId;
  const user = req.session.user;

  if (!user) {
    return res.render("error", { errorMessage: "User not found" });
  }

  const userId = user._id;

  User.findById(userId)
    .then((foundUser) => {
      if (!foundUser) {
        return res.render("error", { errorMessage: "User not found" });
      }

      const bookInCart = foundUser.cart.find((item) => item.book.toString() === bookId);

      if (bookInCart) {
        return res.render("error", { errorMessage: "Book is already in your cart" });
      }

      Book.findById(bookId)
        .then((book) => {
          if (!book) {
            return res.render("error", { errorMessage: "Book not found" });
          }

          if (book.quantity === 0) {
            return res.render("error", { errorMessage: "Book is not available" });
          }

          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + book.maxDays);

          foundUser.cart.push({ book: book, dueDate: dueDate });
          return foundUser.save()
            .then(() => {
              return res.render("cart", { user: foundUser });
            });
        })
        .catch((err) => {
          console.error(err);
          res.render("error", { errorMessage: "An error occurred" });
        });
    })
    .catch((err) => {
      console.error(err);
      res.render("error", { errorMessage: "An error occurred" });
    });
});

app.post("/register", function(req, res) {
  const username = req.body.username;
  const password = req.body.password;

  User.findOne({ username: username })
    .then(existingUser => {
      if (existingUser) {
        return res.render("register", { errorMessage: "Email already exists" });
      }

      const user = new User({
        username: username,
        password: password
      });

      return user.save();
    })
    .then((savedUser) => {
      req.session.user = savedUser;
      const redirectTo = req.query.redirect || "/branch";
      res.redirect(redirectTo);
    })
    .catch(err => {
      console.error(err);
      res.render("register", { errorMessage: "An error occurred" });
    });
});


app.post("/login", async function (req, res) {
  const username = req.body.username;
  const password = req.body.password;

  // console.log('Entered username:', username);
  // console.log('Entered password:', password);
  // console.log('Entered password length:', password.length);

  try {
    const foundUser = await User.findOne({ username: username });

    // console.log('Found user:', foundUser);

    if (!foundUser) {
      return res.render("login", { error: "Invalid username or password" });
    }
    // console.log('Retrieved password:', foundUser.password);

    if (password === foundUser.password) {
      req.session.user = foundUser;
      // console.log('Session user:', req.session.user);
      return res.redirect("/branch");
    } else {
      return res.render("login", { error: "Invalid username or password" });
    }
  } catch (err) {
    console.error(err);
    res.render("login", { error: "An error occurred" });
  }
});
app.get("/logout", function (req, res) {
  req.session.destroy(function (err) {
    if (err) {
      console.error(err);
      res.render("error", { errorMessage: "An error occurred" });
    } else {
      res.redirect("/");
    }
  });
});
// Example server-side code in app.js
app.get('/book/:id', (req, res) => {
  const bookId = req.params.id;

  // Retrieve the book details, including the due date
  const book = getBookById(bookId);
  const dueDate = new Date(book.dueDate);

  // Prepare the response JSON
  const response = {
    book: book,
    dueDate: dueDate.toISOString(), // Convert the Date object to a string
  };

  // Send the response as JSON
  res.json(response);
});

// Example server-side code
let cart = [];
app.delete('/cart/remove/:id', (req, res) => {
  const itemId = req.params.id;

  // Remove the item from the cart using the itemId

  // Assuming the cart is stored in a variable called "cart"
  const updatedCart = cart.filter(item => item.id !== itemId);
  
  // Send the updated cart as a JSON response
  res.json({ success: true, cart: updatedCart });
});



app.get("/cart", function (req, res) {
  if (!req.session.user) {
    return res.render("error", { errorMessage: "User not found" });
  }

  const userId = req.session.user._id;

  User.findById(userId)
    .populate("cart.book")
    .then((user) => {
      if (!user) {
        return res.render("error", { errorMessage: "User not found" });
      }
      res.render("cart", { user: user });
    })
    .catch((err) => {
      console.error(err);
      res.render("error", { errorMessage: "An error occurred" });
    });
});

app.listen(3000, function () {
  // console.log("Server started on port 3000");
});
