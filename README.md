# Talasco Kitchen - AI-Powered Restaurant Management System

A comprehensive full-stack restaurant management platform featuring AI-powered kitchen optimization, real-time order tracking, inventory management, and intelligent workflow automation. Built with Next.js, TypeScript, and integrated with advanced kitchen agent systems.

## 🚀 Features

### 🎯 Core Functionality
- **Smart Menu Management** - Dynamic menu with real-time availability tracking
- **AI-Powered Kitchen Queue** - Intelligent order prioritization based on prep time and SLA
- **Real-Time Order Tracking** - Live updates across all order statuses
- **Inventory Management** - Stock monitoring with automatic restock alerts
- **Kitchen Display System** - Dual-queue interface (AI Smart Queue + Traditional Queue)
- **Manager Dashboard** - Comprehensive analytics and control panel

### 🤖 AI Kitchen Agents
- **Station Dispatcher** - Optimizes cooking order based on SLA risk and efficiency
- **SLA Watchdog** - Real-time alerts for excessive wait times
- **Prep Planner** - Predicts and recommends pre-dining preparation quantities
- **Inventory Controller** - Maintains optimal stock levels with restocking plans
- **Waste Reduction Agent** - Minimizes food waste through smart substitutions

### 📱 User Interfaces
- **Customer Menu** - Online ordering with stock-aware item availability
- **Kitchen Display** - Real-time cooking queue with AI recommendations
- **Manager Dashboard** - Complete operational oversight and analytics
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
- **AI Integration**: FastAPI backend with Strands SDK
- **Real-time**: WebSocket support for live updates

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
│   │   ├── kitchen-agents/      # AI agent integrations
│   │   └── stations/            # Kitchen station management
│   ├── kitchen/                 # Kitchen display pages
│   ├── manager/                 # Manager dashboard
│   └── layout.tsx               # Root layout
├── client/                      # Frontend components
│   ├── components/              # Reusable UI components
│   ├── pages/                   # Page components
│   ├── hooks/                   # Custom React hooks
│   └── lib/                     # Utility functions
├── StrandsAgent/                # AI Agent backend
│   ├── app/                     # FastAPI application
│   ├── main.py                  # Entry point
│   └── requirements.txt         # Python dependencies
├── shared/                      # Shared types and interfaces
└── docs/                        # Documentation
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PNPM
- PostgreSQL 13+
- Python 3.9+ (for AI agents)

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
# Edit .env.local with your database and API configurations
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

### AI Agents Setup (Optional)

For full AI functionality, set up the FastAPI backend:

```bash
cd StrandsAgent
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Set the environment variable:
```bash
NEXT_PUBLIC_KITCHEN_AGENTS_API=http://localhost:8000
```

## 🎮 Usage

### Customer Experience
1. **Browse Menu** - View available items with real-time stock status
2. **Add to Cart** - Items automatically check availability
3. **Place Order** - Orders appear instantly in kitchen systems

### Kitchen Operations
1. **AI Smart Queue** - Follow AI recommendations for optimal cooking order
2. **Traditional Queue** - Complete orders by table for familiarity
3. **Real-time Updates** - Status changes sync across all displays
4. **SLA Monitoring** - Automatic alerts for orders approaching time limits

### Manager Dashboard
1. **Order Analytics** - Track completion times and efficiency metrics
2. **Inventory Management** - Monitor stock levels and restocking needs
3. **Kitchen Performance** - View station efficiency and bottleneck analysis
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

### Kitchen Agents
- `GET /api/kitchen-agents/station-dispatcher` - Get AI recommendations
- `GET /api/kitchen-agents/queue` - Get contextual queue
- `POST /api/kitchen-agents/item/start` - Start cooking item
- `POST /api/kitchen-agents/item/complete` - Complete item

### Stations
- `GET /api/stations` - List kitchen stations
- `POST /api/stations/{id}/dispatch` - Dispatch to station

## 🤖 AI Agent Integration

The system integrates with sophisticated AI agents that provide:

### Prep Planner
- Analyzes historical data to predict demand
- Generates preparation schedules for optimal efficiency
- Considers ingredient availability and shelf life

### Inventory Controller
- Monitors stock levels against demand patterns
- Generates purchase orders with supplier optimization
- Tracks waste and suggests alternatives

## 📊 Database Schema

The system uses PostgreSQL with the following key tables:

- **orders** - Customer orders with status tracking
- **orderitems** - Individual items within orders
- **menuitems** - Menu catalog with pricing and categories
- **ingredients** - Inventory tracking with thresholds
- **menuitemingredients** - Recipe composition
- **stations** - Kitchen station configuration

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

# AI Agents (optional)
NEXT_PUBLIC_KITCHEN_AGENTS_API=http://localhost:8000

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

- **Real-time Updates** - WebSocket connections for instant synchronization
- **Optimized Queries** - Efficient database queries with proper indexing
- **Caching Strategy** - React Query for API response caching
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

- **Strands SDK** - For AI agent framework
- **Radix UI** - For accessible component primitives
- **TailwindCSS** - For utility-first styling
- **Next.js Team** - For the amazing React framework

## 📞 Support

For support, email support@talasco-kitchen.com or join our Slack channel.

---

**Built with ❤️ for modern restaurants**
