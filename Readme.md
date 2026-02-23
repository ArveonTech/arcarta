# 📦 E-Commerce REST API

## 📖 About This Project

This project is a RESTful E-Commerce Backend API built using Node.js, Express, and PostgreSQL.

It handles core e-commerce functions including authentication, product management, shopping cart operations, and reviews.

The system is designed with a proper relational database structure and modular schema separation.

---

## 🚀 Features

* Authentication & Authorization (JWT-based)
* 👤 User & Profile Management
* 🛍️ Product Management
* 🖼️ Product Image Handling
* 🛒 Shopping Cart (Add, Update Quantity, Delete)
* ⭐ Review & Rating System
* 🗂️ Modular PostgreSQL Schema (auth, catalog, orders)
* 🔄 Database Transactions (BEGIN, COMMIT, ROLLBACK)
* 🧩 Relational Queries using JOIN
* ⚠️ Consistent Error Handling

---

## 🛠️ Technology Stack

* Node.js
* Express.js
* PostgreSQL
* JWT
* SQL Transactions

---

## ⚙️ Installation & Setup

### 1. Clone the Repository

```
git clone <https://github.com/ArveonTech/ArFinance.git>
cd to the directory
```

### 2. Install Dependencies

```
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the root directory:

```
PORT=3000
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_secret_key
```

### 4. Set the Database

* Create a PostgreSQL database
* Run your SQL schema file (tables, schemas, relations)

Examples of schemas used:

* auth
* catalog
* orders

### 5. Start the Server

```
npm run dev
```

The server will run at:

```
http://localhost:3000