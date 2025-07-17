require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const port = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT) || 100,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10mb' }));

// Logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Mock Airbnb functions (Railway-compatible)
async function mockAirbnbSearch(params) {
  const mockListings = [
    {
      id: "mock-1",
      name: `Sample Listing in ${params.location}`,
      price: "$150/night",
      rating: "4.8 (127 reviews)",
      location: params.location,
      url: "https://airbnb.com/rooms/mock-1",
      image: "https://via.placeholder.com/300x200",
      amenities: ["WiFi", "Kitchen", "Parking"],
      host: "Jane Doe"
    },
    {
      id: "mock-2", 
      name: `Cozy Apartment in ${params.location}`,
      price: "$89/night",
      rating: "4.6 (89 reviews)",
      location: params.location,
      url: "https://airbnb.com/rooms/mock-2",
      image: "https://via.placeholder.com/300x200",
      amenities: ["WiFi", "AC", "Pool"],
      host: "John Smith"
    }
  ];

  return {
    success: true,
    count: mockListings.length,
    listings: mockListings,
    searchParams: params
  };
}

async function mockListingDetails(id, params) {
  return {
    success: true,
    listing: {
      id: id,
      name: "Beautiful Modern Apartment",
      description: "A stunning apartment with all modern amenities...",
      price: "$150/night",
      rating: "4.8 (127 reviews)",
      location: "Downtown Area",
      amenities: ["WiFi", "Kitchen", "Parking", "Pool", "Gym", "AC"],
      host: {
        name: "Jane Doe",
        rating: "4.9",
        responseRate: "100%",
        responseTime: "within an hour"
      },
      policies: {
        checkIn: "3:00 PM",
        checkOut: "11:00 AM",
        cancellation: "Flexible"
      },
      images: [
        "https://via.placeholder.com/800x600",
        "https://via.placeholder.com/800x600"
      ],
      searchParams: params
    }
  };
}

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Airbnb Railway API',
    version: '1.0.0',
    uptime: process.uptime()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MCP Airbnb Railway API',
    version: '1.0.0',
    description: 'Railway deployment of MCP Airbnb server',
    endpoints: {
      search: 'POST /api/search - Search Airbnb listings',
      listing: 'POST /api/listing/:id - Get listing details',
      health: 'GET /health - Health check'
    },
    usage: {
      searchExample: {
        method: 'POST',
        url: '/api/search',
        body: {
          location: 'Miami Beach',
          checkin: '2025-08-15',
          checkout: '2025-08-20',
          adults: 2
        }
      }
    }
  });
});

// Search Airbnb listings
app.post('/api/search', async (req, res) => {
  try {
    const { 
      location, 
      checkin, 
      checkout, 
      adults = 1, 
      children = 0, 
      infants = 0, 
      pets = 0, 
      minPrice, 
      maxPrice,
      placeId 
    } = req.body;

    // Validation
    if (!location) {
      return res.status(400).json({ 
        error: 'Location is required',
        example: { location: 'New York, NY' }
      });
    }

    const searchParams = {
      location,
      checkin,
      checkout,
      adults: parseInt(adults),
      children: parseInt(children),
      infants: parseInt(infants),
      pets: parseInt(pets),
      minPrice: minPrice ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
      placeId
    };

    // Use mock function for now
    const result = await mockAirbnbSearch(searchParams);

    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      source: 'mock-data'
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Get listing details
app.post('/api/listing/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkin, checkout, adults = 1, children = 0, infants = 0, pets = 0 } = req.body;

    if (!id) {
      return res.status(400).json({ 
        error: 'Listing ID is required' 
      });
    }

    const searchParams = {
      id,
      checkin,
      checkout,
      adults: parseInt(adults),
      children: parseInt(children),
      infants: parseInt(infants),
      pets: parseInt(pets)
    };

    // Use mock function for now
    const result = await mockListingDetails(id, searchParams);

    res.json({
      ...result,
      timestamp: new Date().toISOString(),
      source: 'mock-data'
    });

  } catch (error) {
    console.error('Listing details error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch listing details',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 MCP Airbnb Railway API running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Health check: http://localhost:${port}/health`);
  console.log(`📖 API docs: http://localhost:${port}/`);
});
