# Personal Budget Tracker

## Purpose
A full-stack personal finance application for tracking income, expenses, budgets, and savings goals. It delivers a professional fintech-style dashboard with real-time analytics, category-based spending insights, and a clean glassmorphism UI — backed by a secure REST API and MongoDB database.

---

## Live Demo

[Open Personal Budget Tracker](https://personal-budget-tracker-phase4b-backup.onrender.com/)

---

## Implemented Features

- **Professional Fintech Dashboard**: High-level financial summary with net worth, monthly cash flow, recent activity, and key metrics — styled with a modern glassmorphism design system.
- **Income & Expense Tracking**: Add, edit, delete, and filter income and expense transactions with categories, payment methods, notes, and dates.
- **Transaction Import**: Bulk import transactions via CSV with intelligent field mapping.
- **Budget Management**: Create and manage monthly category budgets with real-time progress tracking and threshold alerts.
- **Savings Goals**: Define savings targets with goal amounts, target dates, and visual milestone progress; record contributions over time.
- **Analytics & Charts**: Spending breakdown by category, income vs. expense trends, and historical cash flow charts.
- **In-App Notifications**: Real-time notification bell for budget alerts and savings milestones.
- **Theme Customization**: Multiple colour themes with a live theme selector modal.
- **Authentication**: JWT-based user registration and login with protected routes and persistent sessions.
- **User Profile & Settings**: View and update profile information and application preferences.
- **Backend REST API**: Full Express.js API covering auth, transactions, budgets, savings, dashboard summaries, analytics, and notifications.
- **MongoDB Integration**: Mongoose ODM with schemas for users, transactions, budgets, savings goals, and notifications.
- **Demo Mode**: Pre-seeded demo data service for quick exploration without account setup.

---

## Technology Stack

### Frontend
- **React (v18)**: Component-based UI library
- **Vite**: Ultra-fast build tool and dev server
- **JavaScript (ES6+)**: Frontend logic
- **HTML5 & Vanilla CSS**: Modern, responsive CSS design system with custom properties and glassmorphism styling
- **Lucide React**: Clean, modern iconography
- **React Context API**: Global state management for auth and theme

### Backend
- **Node.js**: Server runtime environment
- **Express.js**: REST API framework
- **Mongoose (v8)**: Object Data Modeling (ODM) for MongoDB
- **JSON Web Tokens (JWT)**: Stateless authentication and session management
- **bcryptjs**: Password hashing
- **CORS & Helmet**: Security headers and cross-origin resource sharing
- **Morgan**: HTTP request logging

### Database
- **MongoDB**: NoSQL document database (MongoDB Atlas in production)

### Development Tools
- **npm**: Package management and script orchestration
- **VS Code**: Standard workspace layout and configuration

---

## Project Structure

```text
personal-budget-tracker/
│
├── client/                          # Frontend React application
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # Reusable UI components
│   │   │   ├── BrandLogo.jsx        # App logo component
│   │   │   ├── BudgetForm.jsx       # Budget create/edit form
│   │   │   ├── DeleteConfirmModal.jsx        # Reusable delete confirmation dialog
│   │   │   ├── NotificationBell.jsx          # In-app notification bell & dropdown
│   │   │   ├── ProtectedRoute.jsx            # Auth-gated route wrapper
│   │   │   ├── SavingsContributionModal.jsx  # Record a savings contribution
│   │   │   ├── SavingsGoalForm.jsx           # Savings goal create/edit form
│   │   │   ├── ThemeSelectorModal.jsx        # Live theme picker modal
│   │   │   ├── TransactionForm.jsx           # Transaction create/edit form
│   │   │   └── TransactionImportModal.jsx    # CSV bulk import modal
│   │   ├── constants/
│   │   │   └── categories.js        # Shared income & expense category definitions
│   │   ├── context/
│   │   │   ├── AuthContext.jsx      # Authentication state & JWT management
│   │   │   └── ThemeContext.jsx     # Theme state & CSS variable injection
│   │   ├── pages/
│   │   │   ├── DashboardPage.jsx    # Main financial overview dashboard
│   │   │   ├── TransactionsPage.jsx # Transaction list, filters, CRUD
│   │   │   ├── BudgetsPage.jsx      # Budget list, progress bars, CRUD
│   │   │   ├── SavingsPage.jsx      # Savings goals, contributions, progress
│   │   │   ├── LoginPage.jsx        # User login screen
│   │   │   └── RegisterPage.jsx     # User registration screen
│   │   ├── services/
│   │   │   └── api.js               # Centralised Axios API client with auth headers
│   │   ├── utils/
│   │   │   └── formatters.js        # Currency, date, and number formatting helpers
│   │   ├── App.jsx                  # Root component, routing & navigation layout
│   │   ├── index.css                # Global design system, themes & animations
│   │   └── main.jsx                 # React DOM entry point
│   ├── index.html                   # HTML document template with SEO metadata
│   ├── package.json                 # Frontend dependencies and build scripts
│   └── vite.config.js               # Vite build and proxy configuration
│
├── server/                          # Backend REST API application
│   ├── config/
│   │   └── db.js                    # MongoDB connection manager
│   ├── controllers/
│   │   ├── authController.js        # Register, login, profile endpoints
│   │   ├── budgetController.js      # Budget CRUD & progress calculations
│   │   ├── dashboardController.js   # Dashboard summary aggregations
│   │   ├── healthController.js      # Health check endpoint
│   │   ├── notificationController.js# Notification listing & management
│   │   ├── savingsController.js     # Savings goals CRUD & contributions
│   │   └── transactionController.js # Transaction CRUD, filters & analytics
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT verification & user injection
│   │   ├── errorHandler.js          # Centralised error handler (400–500)
│   │   └── notFoundHandler.js       # 404 handler for unmapped routes
│   ├── models/                      # Mongoose schemas
│   │   ├── User.js                  # User accounts schema
│   │   ├── Transaction.js           # Income & expense transactions schema
│   │   ├── Budget.js                # Monthly category budgets schema
│   │   ├── SavingsGoal.js           # Savings goals & contributions schema
│   │   └── Notification.js          # In-app notifications schema
│   ├── routes/                      # Express API route definitions
│   │   ├── index.js                 # Main router — aggregates all /api endpoints
│   │   ├── authRoutes.js            # POST /api/auth/register, /login, /profile
│   │   ├── transactionRoutes.js     # Full CRUD — /api/transactions
│   │   ├── budgetRoutes.js          # Full CRUD — /api/budgets
│   │   ├── savingsRoutes.js         # Full CRUD + contributions — /api/savings
│   │   ├── dashboardRoutes.js       # GET /api/dashboard/summary
│   │   ├── analyticsRoutes.js       # GET /api/analytics/*
│   │   ├── notificationRoutes.js    # GET/PATCH /api/notifications
│   │   └── healthRoutes.js          # GET /api/health
│   ├── services/
│   │   ├── demoService.js           # Demo data seeding service
│   │   ├── notificationService.js   # Notification creation helpers
│   │   └── transactionImportService.js # CSV parsing & bulk import logic
│   ├── utils/
│   │   └── apiResponse.js           # Uniform success & error JSON response helpers
│   ├── tests/                       # Backend test files
│   ├── package.json                 # Backend dependencies & scripts
│   └── server.js                    # Express application entry point
│
├── .env.example                     # Template for required environment variables
├── .gitignore                       # Git ignore rules for node_modules, .env, build output
├── package.json                     # Root package for workspace orchestration
└── README.md                        # Project documentation
```

---

## Setup Instructions

### 1. Prerequisites
Ensure you have the following installed on your system:
- **Node.js** (v18.0.0 or higher recommended)
- **npm** (v9.0.0 or higher)
- **MongoDB** — a local instance or a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster

### 2. Environment Configuration
Copy `.env.example` to create a `.env` file, then fill in your values:
```bash
cp .env.example .env
```
Required environment variables (see `.env.example` for the full list):
```env
PORT=5000
MONGODB_URI=<your-mongodb-connection-string>
JWT_SECRET=<a-strong-random-secret>
NODE_ENV=development
```

> **Never commit `.env` to version control.** It is listed in `.gitignore`.

### 3. Install Dependencies
```bash
# Install root orchestration packages
npm install

# Install backend dependencies
cd server && npm install && cd ..

# Install frontend dependencies
cd client && npm install && cd ..
```

### 4. Running the Application

#### Run Backend Server Only:
```bash
npm run server
```
The API server will start on `http://localhost:5000`.

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

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | API health check |
| POST | `/api/auth/register` | Register a new user |
| POST | `/api/auth/login` | Authenticate and receive a JWT |
| GET | `/api/auth/profile` | Get authenticated user profile |
| GET/POST | `/api/transactions` | List or create transactions |
| GET/PUT/DELETE | `/api/transactions/:id` | Read, update, or delete a transaction |
| GET/POST | `/api/budgets` | List or create budgets |
| GET/PUT/DELETE | `/api/budgets/:id` | Read, update, or delete a budget |
| GET/POST | `/api/savings` | List or create savings goals |
| POST | `/api/savings/:id/contributions` | Record a contribution to a savings goal |
| GET | `/api/dashboard/summary` | Aggregated financial dashboard data |
| GET | `/api/analytics/*` | Spending analytics and trends |
| GET/PATCH | `/api/notifications` | List and mark notifications as read |

---

## Security Principles
- **Password Hashing**: All passwords are hashed with bcrypt before storage. Plaintext passwords are never stored.
- **JWT Authentication**: Stateless token-based authentication; tokens are verified on every protected request.
- **No Financial Initiations**: The application never initiates payments or transfers.
- **Strict Data Scoping**: All financial records are isolated by `userId` — users can only access their own data.
- **Environment Isolation**: Database URIs and JWT secrets are stored exclusively in `.env` and excluded from version control.
- **Security Headers**: Helmet middleware sets HTTP security headers on every response.
