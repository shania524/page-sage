 var cartData = <%= JSON.stringify(user.cart) %>; // Pass the user.cart as a JSON object to JavaScript

    function removeFromCart(bookId) {
      cartData = cartData.filter(item => item.book.id !== bookId);
      renderCart(); // Call a function to update the cart display
    }

    function renderCart() {
        console.log('renderCart() function called');
      console.log(cartData)
      var cartItemsDiv = document.querySelector('.cart-items');
      var emptyCartMsg = document.querySelector('.empty-cart');

      if (cartData.length > 0) {
        cartItemsDiv.innerHTML = ''; // Clear existing cart items

        cartData.forEach(function (item) {
          var cartItemDiv = document.createElement('div');
          cartItemDiv.classList.add('cart-item');

          var bookDetailsDiv = document.createElement('div');
          bookDetailsDiv.classList.add('book-details');

          var bookImage = document.createElement('img');
          bookImage.classList.add('book-image');
          bookImage.src = item.book.image;
          bookImage.alt = item.book.title;
          bookDetailsDiv.appendChild(bookImage);

          var bookTitle = document.createElement('h3');
          bookTitle.classList.add('book-title');
          bookTitle.textContent = item.book.title;
          bookDetailsDiv.appendChild(bookTitle);

          var bookAuthor = document.createElement('p');
          bookAuthor.classList.add('book-author');
          bookAuthor.textContent = 'By ' + item.book.author;
          bookDetailsDiv.appendChild(bookAuthor);

          var bookDescription = document.createElement('p');
          bookDescription.classList.add('book-description');
          bookDescription.textContent = item.book.description;
          bookDetailsDiv.appendChild(bookDescription);

          cartItemDiv.appendChild(bookDetailsDiv);

          var dueDateDiv = document.createElement('div');
          dueDateDiv.classList.add('due-date');

          var dueDate = document.createElement('p');
          dueDate.textContent = 'Due Date: ' + item.dueDate.toDateString();
          dueDateDiv.appendChild(dueDate);

          cartItemDiv.appendChild(dueDateDiv);

          var removeBtn = document.createElement('button');
          removeBtn.classList.add('remove-btn');
          removeBtn.textContent = 'Remove from Cart';
          removeBtn.onclick = function () {
            removeFromCart(item.book.id);
          };
          cartItemDiv.appendChild(removeBtn);

          cartItemsDiv.appendChild(cartItemDiv);
        });

        emptyCartMsg.style.display = 'none'; // Hide empty cart message
      } else {
        cartItemsDiv.innerHTML = ''; // Clear existing cart items
        emptyCartMsg.style.display = 'block'; // Show empty cart message
      }
    }

    document.addEventListener('DOMContentLoaded', function () {
      renderCart();
    });