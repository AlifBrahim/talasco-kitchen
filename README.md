# Talasco Kitchen - AI-Powered Restaurant Management System

A comprehensive full-stack restaurant management platform featuring AI-powered forecasting, real-time order tracking, inventory management, and intelligent kitchen workflow automation. Built with Next.js, TypeScript, and integrated with Amazon Nova Pro AI for advanced demand prediction and prep planning.

## 🚀 Features

### 🎯 Core Functionality
- **Smart Menu Management** - Dynamic menu with real-time availability tracking
- **Real-Time Order Tracking** - Live updates across all order statuses
- **Inventory Management** - Stock monitoring with automatic restock alerts
- **Kitchen Display System** - Real-time cooking queue interface
- **Manager Dashboard** - Comprehensive analytics and AI forecasting control panel

### 🤖 AI Forecasting System
- **Demand Forecasting** - AI-powered prediction of food orders using Amazon Nova Pro
- **Trend Analysis** - Historical data analysis with seasonal pattern recognition
- **Prep Planning** - Intelligent pre-preparation recommendations for chefs
- **Cost Analysis** - Automated cost estimation for prep recommendations
- **Waste Risk Assessment** - Smart waste prediction and mitigation strategies

### 📱 User Interfaces
- **Customer Menu** - Online ordering with stock-aware item availability
- **Kitchen Display** - Real-time cooking queue interface
- **Manager Dashboard** - Complete operational oversight with AI forecasting
- **Mobile-Responsive** - Works seamlessly across all devices

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS 3 + Radix UI components
- **State Management**: React hooks + TanStack Query
- **Icons**: Lucide React
- **Charts**: Recharts

### Backend
- **Runtime**: Node.js with Next.js API routes
- **Database**: PostgreSQL
- **Validation**: Zod schemas
- **AI Integration**: Amazon Nova Pro via AWS Bedrock
- **Real-time**: Live API updates for order tracking

### Development
- **Package Manager**: PNPM
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Type Checking**: TypeScript strict mode

## 📁 Project Structure

```
├── app/                          # Next.js App Router
│   ├── api/                      # API endpoints
│   │   ├── orders/              # Order management
│   │   ├── menu-items/          # Menu and inventory
│   │   ├── forecast/            # AI forecasting endpoints
│   │   └── kitchen-status/      # Kitchen status management
│   ├── kitchen/                 # Kitchen display pages
│   ├── manager/                 # Manager dashboard
│   └── layout.tsx               # Root layout
├── client/                      # Frontend components
│   ├── components/              # Reusable UI components
│   ├── pages/                   # Page components
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Utility functions
├── shared/                      # Shared types and interfaces
├── lib/                         # Database utilities
└── docs/                        # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PNPM
- PostgreSQL 13+
- AWS Account (for AI forecasting)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd talasco-kitchen
```

2. **Install dependencies**
```bash
pnpm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
# Edit .env.local with your database and AWS configurations
# Required: DATABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
```

4. **Set up the database**
```bash
# Create PostgreSQL database
createdb talasco_kitchen

# Run migrations (if available)
pnpm db:migrate
```

5. **Start the development server**
```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

### AI Forecasting Setup

Configure AWS Bedrock for AI forecasting:

1. **Set up AWS credentials** in your `.env.local`:
```bash
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0
```

2. **Enable Amazon Nova Pro** in AWS Bedrock console
3. **Test the forecasting** via the Manager Dashboard

## 🎮 Usage

### Customer Experience
1. **Browse Menu** - View available items with real-time stock status
2. **Add to Cart** - Items automatically check availability
3. **Place Order** - Orders appear instantly in kitchen systems

### Kitchen Operations
1. **Kitchen Display** - View real-time cooking queue
2. **Order Management** - Track and update order statuses
3. **Real-time Updates** - Status changes sync across all displays

### Manager Dashboard
1. **AI Forecasting** - Access demand prediction and trend analysis
2. **Prep Planning** - Get AI recommendations for pre-preparation
3. **Inventory Management** - Monitor stock levels and restocking needs
4. **Menu Management** - Update availability and pricing in real-time

## 🔌 API Endpoints

### Orders
- `GET /api/orders` - List all orders
- `POST /api/orders/place` - Create new order
- `PATCH /api/orders/{id}/status` - Update order status
- `PATCH /api/orders/{id}/items/{itemId}/status` - Update item status

### Menu & Inventory
- `GET /api/menu-items` - Get menu items
- `GET /api/menu-items/availability` - Check stock availability
- `POST /api/inventory/restock` - Trigger restocking

### AI Forecasting
- `POST /api/forecast/demand` - Get demand predictions
- `POST /api/forecast/trends` - Analyze historical trends
- `POST /api/forecast/prep-plan` - Generate prep recommendations
- `GET /api/forecast/historical-data` - Get raw historical data
- `POST /api/forecast/seed-demo-data` - Seed demo data for testing

### Kitchen Status
- `GET /api/kitchen-status` - Get current kitchen status

## 🤖 AI Forecasting Integration

The system integrates with Amazon Nova Pro AI for advanced forecasting capabilities:

### Demand Forecasting
- Analyzes historical order data to predict future demand
- Uses seasonal patterns and trend analysis
- Provides confidence scores for predictions
- Considers time-of-day and day-of-week patterns

### Trend Analysis
- Identifies increasing, decreasing, and stable trends
- Analyzes growth rates and peak hours
- Provides actionable recommendations
- Tracks seasonal patterns and external factors

### Prep Planning
- Generates intelligent pre-preparation recommendations
- Calculates optimal quantities with safety buffers
- Estimates costs and waste risk scores
- Provides detailed rationale for each recommendation

## 📊 Database Schema

The system uses PostgreSQL with the following key tables:

- **orders** - Customer orders with status tracking
- **orderitems** - Individual items within orders  
- **menuitems** - Menu catalog with pricing and categories
- **ingredients** - Inventory tracking with stock levels
- **menuitemingredients** - Recipe composition mapping
- **sections** - Kitchen section configuration

See `Schema.md` for complete database documentation.

## 🚀 Deployment

### Production Build
```bash
pnpm build
pnpm start
```

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/talasco_kitchen

# AWS Bedrock AI Integration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=amazon.nova-pro-v1:0

# Other configurations
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com
```

### Cloud Deployment
The application is optimized for deployment on:
- **Vercel** - Recommended for Next.js applications
- **Netlify** - Alternative with serverless functions
- **Railway** - Full-stack deployment with database
- **Docker** - Containerized deployment

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

## 📈 Performance

- **Real-time Updates** - Live API updates for instant synchronization
- **Optimized Queries** - Efficient database queries with proper indexing
- **AI Response Caching** - Intelligent caching for forecasting results
- **Image Optimization** - Next.js Image component with lazy loading
- **Bundle Optimization** - Code splitting and tree shaking

## 🔒 Security

- **Input Validation** - Zod schemas for all API endpoints
- **SQL Injection Prevention** - Parameterized queries
- **CORS Configuration** - Proper cross-origin resource sharing
- **Environment Variables** - Secure configuration management
- **Rate Limiting** - API endpoint protection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Amazon Nova Pro** - For advanced AI forecasting capabilities
- **AWS Bedrock** - For AI model hosting and inference
- **Radix UI** - For accessible component primitives
- **TailwindCSS** - For utility-first styling
- **Next.js Team** - For the amazing React framework

## 📞 Support

For support, email support@talasco-kitchen.com or join our Slack channel.

---

**Built with ❤️ for modern restaurants**
