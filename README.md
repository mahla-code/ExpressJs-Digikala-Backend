# Digikala-Style Shop API

A backend for an online store inspired by Digikala, built with Node.js, Express and MySQL. It covers the full shopping journey: signing in with a phone number, browsing products, filling a basket, paying through Zarinpal, and following an order until it reaches the customer.

I built this to practice designing a real-world e-commerce flow, especially the tricky parts: products with different variants, price calculation with discounts, and keeping payments and orders consistent.

## What it can do

### Authentication
- Sign in with a phone number and a one-time code (OTP). New users are created automatically.
- Access and refresh tokens (JWT). A refresh token can only be used once, so a stolen one can't be replayed.
- A simple endpoint to check whether the current user is logged in.

### Products
Three kinds of products are supported, because real stores need them:
- **Single**: one price and one stock count.
- **Sizing**: every size has its own price, discount and stock.
- **Coloring**: every color has its own price, discount and stock.

Products can also carry extra details as key/value pairs (for example "Material: Cotton").

### Basket
- Add products to the basket, with stock checks for the chosen size or color.
- Adding the same item again increases its quantity, up to the available stock.
- The basket returns the total price, the discount amount and the final price.

### Payment
- Creates a payment and an order from the basket, then hands the user over to Zarinpal.
- After the user comes back from the gateway, the payment is verified, the order moves forward, stock is reduced and the basket is cleared.
- These steps run inside database transactions, so an order never ends up half-created if something fails midway.

### Orders
- List your orders (filtered by status) and view the details of a single order.
- Orders move through a fixed path: `pending → in-process → packed → in-transit → delivery`.
- Orders can be canceled with a reason once they are past the pending stage.

### Roles and permissions (RBAC)
Roles and permissions can be created, and permissions can be assigned to roles.

## Tech stack

| Area | Technology |
|---|---|
| Runtime and framework | Node.js, Express |
| Database | MySQL with Sequelize ORM |
| Authentication | JWT (access and refresh tokens) |
| Validation | express-validation (Joi) |
| Payments | Zarinpal, called through Axios |
| Errors | http-errors with a global error handler |

## Getting started

```bash
# install dependencies
npm install

# create your env file and fill it in
cp .env.example .env

# start the server
npm start
```

The server runs on the port set in `PORT` (3000 by default).

On the very first run against an empty database, uncomment the `sequelize.sync` line at the bottom of `config/models.initial.js` so the tables get created, then comment it out again.

## Environment variables

| Variable | Purpose |
|---|---|
| `PORT` | Port the server listens on |
| `NODE_ENV` | Set to `development` to get the OTP code back in the response while testing |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection |
| `ACCESS_TOKEN_SECRET`, `REFRESH_TOKEN_SECRET` | Secrets used to sign the two token types |
| `ZARINPAL_REQUEST_URL`, `ZARINPAL_VERIFY_URL`, `ZARINPAL_MERCHANT_ID`, `ZARINPAL_CALLBACK_URL`, `ZARINPAL_GATEWAY_URL` | Zarinpal settings |

## API overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/send-otp` | No | Send a one-time code to a phone number |
| POST | `/auth/check-otp` | No | Verify the code and receive tokens |
| POST | `/auth/refresh-token` | No | Exchange a refresh token for a new pair |
| GET | `/auth/check-login` | Yes | Get the current user |
| GET | `/product` | No | List products |
| GET | `/product/:id` | No | Product details with colors and sizes |
| POST | `/product` | Yes | Create a product |
| DELETE | `/product/:id` | Yes | Delete a product |
| POST | `/basket/add` | Yes | Add an item to the basket |
| GET | `/basket` | Yes | View the basket with totals |
| POST | `/payment` | Yes | Create an order and get the payment link |
| GET | `/payment/callback` | No | Zarinpal callback, verifies the payment |
| GET | `/order` | Yes | List my orders (`?status=`) |
| GET | `/order/:id` | Yes | Order details |
| PATCH | `/order/set-packed/:id` | Yes | Mark as packed |
| PATCH | `/order/set-in-transit/:id` | Yes | Mark as in transit |
| PATCH | `/order/set-delivery/:id` | Yes | Mark as delivered |
| PATCH | `/order/cancel/:id` | Yes | Cancel with a reason |
| POST | `/rbac/role` | Yes | Create a role |
| POST | `/rbac/permission` | Yes | Create a permission |
| POST | `/rbac/add-permission-to-role` | Yes | Assign permissions to a role |

## Project structure

```
app.js                 # app setup, routes, error handling
config/                # Sequelize connection and model relations
common/constant/       # shared constants (order statuses, product types)
modules/
├── auth/              # OTP login, tokens, auth guard
├── user/              # user, OTP and refresh token models
├── product/           # products, colors, sizes, details
├── basket/            # basket and price calculation
├── payment/           # payment flow
├── order/             # orders and status changes
├── RBAC/              # roles and permissions
├── discount/          # discount model
└── services/          # Zarinpal integration
```

## Current limitations

This is a work in progress, and a few things are intentionally not finished yet:

- **Discount codes** are not implemented. Percentage discounts set on products, colors and sizes work, but there is no way to enter a code yet; only the database model exists.
- **Roles and permissions** can be created, but they are not attached to users or enforced on routes yet. For now, any logged-in user can create products or change an order's status.
- **OTP delivery** has no SMS provider connected. In development mode the code is returned in the API response instead.
- The shipping address is currently a fixed placeholder.
