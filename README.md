# Personal Budget Tracker

## Purpose
A personal finance application for tracking income, expenses, budgets, savings, and spending patterns. It provides clear visibility into cash flow, helps establish and monitor budgeting limits, sets savings goals, and prepares the architectural foundation for privacy-focused SMS transaction detection in future phases.

---

## Current Phase
**Phase 1 — Project Foundation & Architecture**

Phase 1 establishes the initial repository layout, directory architecture, database schemas, centralized error-handling strategy, environment configurations, and the foundational `/api/health` REST endpoint.

---

## Planned Features
- **Manual Income Tracking**: Record inflow with payment methods, categories, and custom notes.
- **Manual Expense Tracking**: Log day-to-day expenditures with categorized breakdowns.
- **Dynamic Categories**: Flexible category tagging for transactions and budgets.
- **Budget Management**: Monthly spending limits with threshold alerts and progress tracking.
- **Savings Goals**: Goal tracking with target dates and visual milestone progress.
- **Financial Dashboard**: High-level financial summary of net worth, monthly cash flow, and recent activity.
- **Spending Analytics**: Breakdown charts and trend analysis using modern charting.
- **Transaction SMS Detection** *(Future Phase)*: Local, privacy-first SMS parsing for automatic expense detection.
- **Transaction Confirmation Workflow**: User review and confirmation for auto-detected transactions.

---

## Technology Stack

### Frontend
- **React (v18)**: Component-based UI library
- **Vite**: Ultra-fast build tool and dev server
- **JavaScript (ES6+)**: Frontend logic
- **HTML5 & Vanilla CSS**: Modern, responsive CSS design system with custom properties and glassmorphism styling
- **Lucide React**: Clean, modern iconography

### Backend
- **Node.js**: Server runtime environment
- **Express.js**: REST API framework
- **Mongoose (v8)**: Object Data Modeling (ODM) for MongoDB
- **CORS & Helmet**: Security headers and cross-origin resource sharing
- **Morgan**: HTTP request logging

### Database
- **MongoDB**: NoSQL document database

### Development Tools
- **npm**: Package management and script orchestration
- **VS Code**: Standard workspace layout and configuration

---

## Project Structure

```text
personal-budget-tracker/
│
├── client/                     # Frontend React application
│   ├── public/                 # Static assets
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── services/           # Frontend API services
│   │   ├── App.jsx             # Root React component & system status dashboard
│   │   ├── index.css           # Global design system and theme styles
│   │   └── main.jsx            # React DOM mounting entry point
│   ├── index.html              # HTML document template with SEO metadata
│   ├── package.json            # Frontend dependencies and build scripts
│   └── vite.config.js          # Vite build and proxy configuration
│
├── server/                     # Backend REST API application
│   ├── config/
│   │   └── db.js               # MongoDB connection manager with resilient fallback
│   ├── controllers/
│   │   └── healthController.js # Health check endpoint controller logic
│   ├── middleware/
│   │   ├── errorHandler.js     # Centralized error handler (400, 401, 403, 404, 500)
│   │   └── notFoundHandler.js  # 404 handler for unmapped routes
│   ├── models/                 # Mongoose schemas
│   │   ├── User.js             # User accounts schema
│   │   ├── Transaction.js      # Income & expense transactions schema
│   │   ├── Budget.js           # Monthly category budgets schema
│   │   └── SavingsGoal.js      # Financial targets & savings goals schema
│   ├── routes/                 # Express API routes
│   │   ├── index.js            # Main router aggregating all /api endpoints
│   │   ├── healthRoutes.js     # GET /api/health route
│   │   ├── authRoutes.js       # Auth endpoint stubs
│   │   ├── transactionRoutes.js# Transaction endpoint stubs
│   │   ├── budgetRoutes.js     # Budget endpoint stubs
│   │   ├── savingsRoutes.js    # Savings endpoint stubs
│   │   ├── dashboardRoutes.js  # Dashboard endpoint stubs
│   │   └── analyticsRoutes.js  # Analytics endpoint stubs
│   ├── utils/
│   │   └── apiResponse.js      # Uniform success & error JSON response helpers
│   ├── package.json            # Backend dependencies & scripts
│   └── server.js               # Express application server entry point
│
├── .env.example                # Template for required environment variables
├── .env                        # Local development environment configuration (git-ignored)
├── .gitignore                  # Git ignore rules for node_modules, .env, build output
├── package.json                # Root package for workspace orchestration
└── README.md                   # Project documentation
```

---

## Setup Instructions

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)
- **MongoDB** (optional for Phase 1 health check, required for data persistence in later phases)

### 2. Environment Configuration
Copy `.env.example` to create `.env` if it does not already exist:
```bash
cp .env.example .env
```
Default configuration values:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/budget_tracker
JWT_SECRET=your_jwt_secret_key_here
NODE_ENV=development
```

### 3. Install Dependencies
You can install dependencies across the root, server, and client directories:

```bash
# Install root orchestration packages
npm install

# Install backend dependencies
cd server
npm install
cd ..

# Install frontend dependencies
cd client
npm install
cd ..
```

### 4. Running the Application

#### Run Backend Server Only:
```bash
npm run server
```
The server will start on `http://localhost:5000`.

#### Run Frontend Client Only:
```bash
npm run client
```
The frontend dev server will start on `http://localhost:3000`.

#### Run Full-Stack Concurrently:
```bash
npm run dev
```

---

## API Verification

### Health Check Endpoint
- **URL**: `GET /api/health`
- **Expected Response**:
```json
{
  "success": true,
  "message": "Personal Budget Tracker API is running"
}
```

---

## Security Principles from Day One
- **Zero Sensitive Data Storage**: Plaintext passwords, OTPs, banking passwords, and UPI PINs are never stored or requested.
- **No Financial Initiations**: The application never initiates payments or transfers.
- **Strict Data Scoping**: All financial records are isolated by `userId`.
- **Environment Isolation**: Database strings and JWT secrets are stored exclusively in `.env` and excluded from version control.
