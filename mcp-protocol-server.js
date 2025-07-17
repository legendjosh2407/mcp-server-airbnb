const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Enable CORS for all origins
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
  credentials: false
}));

app.use(express.json());

// MCP Server State
let clientConnections = new Map();
let requestId = 1;

// Mock Airbnb data functions
function mockAirbnbSearch(params) {
  const mockListings = [
    {
      id: "mcp-1",
      name: `Luxury Villa in ${params.location || 'Unknown Location'}`,
      price: "$250/night",
      rating: "4.9 (156 reviews)",
      location: params.location || 'Unknown Location',
      url: `https://airbnb.com/rooms/mcp-1`,
      amenities: ["WiFi", "Pool", "Kitchen", "Parking", "Ocean View"],
      host: "Sarah Johnson",
      guests: params.adults || 2,
      checkin: params.checkin || "Available",
      checkout: params.checkout || "Available"
    },
    {
      id: "mcp-2",
      name: `Cozy Apartment in ${params.location || 'Unknown Location'}`,
      price: "$120/night", 
      rating: "4.7 (89 reviews)",
      location: params.location || 'Unknown Location',
      url: `https://airbnb.com/rooms/mcp-2`,
      amenities: ["WiFi", "Kitchen", "AC", "Workspace"],
      host: "Mike Chen",
      guests: params.adults || 2,
      checkin: params.checkin || "Available",
      checkout: params.checkout || "Available"
    },
    {
      id: "mcp-3",
      name: `Modern Studio in ${params.location || 'Unknown Location'}`,
      price: "$89/night",
      rating: "4.6 (234 reviews)", 
      location: params.location || 'Unknown Location',
      url: `https://airbnb.com/rooms/mcp-3`,
      amenities: ["WiFi", "Gym", "Rooftop", "Pet-friendly"],
      host: "Emma Rodriguez",
      guests: params.adults || 2,
      checkin: params.checkin || "Available",
      checkout: params.checkout || "Available"
    }
  ];

  return {
    success: true,
    searchParams: params,
    totalResults: mockListings.length,
    listings: mockListings,
    timestamp: new Date().toISOString()
  };
}

function mockListingDetails(listingId, params) {
  return {
    success: true,
    listing: {
      id: listingId,
      name: "Beautiful Oceanfront Villa",
      description: "Stunning 3-bedroom villa with panoramic ocean views, private pool, and direct beach access. Perfect for families or groups looking for a luxurious getaway.",
      price: "$250/night",
      rating: "4.9 (156 reviews)",
      location: "Oceanfront, Paradise Bay",
      coordinates: { lat: 25.7617, lng: -80.1918 },
      amenities: [
        "Private Pool", "Ocean View", "Beach Access", "WiFi", 
        "Full Kitchen", "Parking", "Air Conditioning", "Washer/Dryer"
      ],
      host: {
        name: "Sarah Johnson",
        rating: "4.95",
        responseRate: "100%",
        responseTime: "within an hour",
        verified: true,
        joinedDate: "2018"
      },
      capacity: {
        maxGuests: 8,
        bedrooms: 3,
        bathrooms: 2,
        beds: 4
      },
      policies: {
        checkIn: "3:00 PM",
        checkOut: "11:00 AM", 
        cancellation: "Flexible",
        smoking: false,
        pets: true,
        parties: false
      },
      pricing: {
        basePrice: 250,
        cleaningFee: 75,
        serviceFee: 42,
        taxes: 28,
        total: 395
      },
      availability: {
        checkin: params.checkin || "Available",
        checkout: params.checkout || "Available",
        minimumStay: 2,
        instantBook: true
      },
      images: [
        "https://via.placeholder.com/800x600/4A90E2/FFFFFF?text=Ocean+View",
        "https://via.placeholder.com/800x600/7ED321/FFFFFF?text=Pool+Area", 
        "https://via.placeholder.com/800x600/F5A623/FFFFFF?text=Interior"
      ],
      reviews: {
        overall: 4.9,
        cleanliness: 4.9,
        accuracy: 4.8,
        communication: 5.0,
        location: 4.9,
        checkIn: 4.8,
        value: 4.7
      }
    },
    searchParams: params,
    timestamp: new Date().toISOString()
  };
}

// MCP Protocol Implementation
const MCP_TOOLS = [
  {
    name: "airbnb_search",
    description: "Search for Airbnb listings in a specific location",
    inputSchema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Location to search for Airbnb listings"
        },
        checkin: {
          type: "string", 
          description: "Check-in date (YYYY-MM-DD format)",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
        },
        checkout: {
          type: "string",
          description: "Check-out date (YYYY-MM-DD format)", 
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
        },
        adults: {
          type: "integer",
          description: "Number of adult guests",
          minimum: 1,
          maximum: 16
        },
        children: {
          type: "integer", 
          description: "Number of children",
          minimum: 0,
          maximum: 5
        },
        infants: {
          type: "integer",
          description: "Number of infants",
          minimum: 0,
          maximum: 5
        },
        pets: {
          type: "integer",
          description: "Number of pets",
          minimum: 0,
          maximum: 5
        },
        minPrice: {
          type: "number",
          description: "Minimum price per night"
        },
        maxPrice: {
          type: "number", 
          description: "Maximum price per night"
        },
        placeId: {
          type: "string",
          description: "Specific place ID for more targeted search"
        }
      },
      required: ["location"]
    }
  },
  {
    name: "airbnb_listing_details",
    description: "Get detailed information about a specific Airbnb listing",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "string",
          description: "Airbnb listing ID"
        },
        checkin: {
          type: "string",
          description: "Check-in date (YYYY-MM-DD format)",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
        },
        checkout: {
          type: "string", 
          description: "Check-out date (YYYY-MM-DD format)",
          pattern: "^\\d{4}-\\d{2}-\\d{2}$"
        },
        adults: {
          type: "integer",
          description: "Number of adult guests",
          minimum: 1,
          maximum: 16
        },
        children: {
          type: "integer",
          description: "Number of children", 
          minimum: 0,
          maximum: 5
        },
        infants: {
          type: "integer",
          description: "Number of infants",
          minimum: 0,
          maximum: 5
        },
        pets: {
          type: "integer",
          description: "Number of pets",
          minimum: 0,
          maximum: 5
        }
      },
      required: ["id"]
    }
  }
];

// MCP JSON-RPC Message Handlers
function handleInitialize(params, id) {
  return {
    jsonrpc: "2.0",
    id: id,
    result: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {
          listChanged: false
        }
      },
      serverInfo: {
        name: "mcp-airbnb-server",
        version: "1.0.0"
      }
    }
  };
}

function handleToolsList(params, id) {
  return {
    jsonrpc: "2.0", 
    id: id,
    result: {
      tools: MCP_TOOLS
    }
  };
}

async function handleToolsCall(params, id) {
  const { name, arguments: args } = params;
  
  try {
    let result;
    
    if (name === "airbnb_search") {
      result = mockAirbnbSearch(args || {});
    } else if (name === "airbnb_listing_details") {
      if (!args.id) {
        throw new Error("Missing required parameter: id");
      }
      result = mockListingDetails(args.id, args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
    
    return {
      jsonrpc: "2.0",
      id: id,
      result: {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2)
          }
        ]
      }
    };
  } catch (error) {
    return {
      jsonrpc: "2.0",
      id: id,
      error: {
        code: -32000,
        message: error.message
      }
    };
  }
}

// Handle MCP JSON-RPC messages
async function handleMCPMessage(message) {
  console.log('Received MCP message:', JSON.stringify(message, null, 2));
  
  const { method, params, id } = message;
  
  switch (method) {
    case "initialize":
      return handleInitialize(params, id);
    case "tools/list":
      return handleToolsList(params, id);
    case "tools/call":
      return await handleToolsCall(params, id);
    default:
      return {
        jsonrpc: "2.0",
        id: id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      };
  }
}

// SSE endpoint for MCP protocol
app.get('/mcp', (req, res) => {
  console.log('MCP SSE connection established');
  
  // Set SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: "connection",
    message: "MCP Server connected",
    timestamp: new Date().toISOString()
  })}\n\n`);
  
  // Store connection
  const connectionId = Date.now().toString();
  clientConnections.set(connectionId, res);
  
  // Handle client disconnect
  req.on('close', () => {
    console.log('MCP SSE connection closed');
    clientConnections.delete(connectionId);
  });
  
  // Keep connection alive
  const keepAlive = setInterval(() => {
    if (clientConnections.has(connectionId)) {
      res.write(`data: ${JSON.stringify({
        type: "ping",
        timestamp: new Date().toISOString()
      })}\n\n`);
    } else {
      clearInterval(keepAlive);
    }
  }, 30000);
});

// MCP JSON-RPC endpoint
app.post('/mcp', async (req, res) => {
  try {
    const message = req.body;
    const response = await handleMCPMessage(message);
    
    console.log('Sending MCP response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('MCP error:', error);
    res.status(500).json({
      jsonrpc: "2.0",
      id: req.body.id || null,
      error: {
        code: -32603,
        message: "Internal error"
      }
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'MCP Airbnb Protocol Server',
    version: '1.0.0',
    protocol: 'MCP 2024-11-05',
    endpoints: {
      mcp_sse: 'GET /mcp',
      mcp_rpc: 'POST /mcp', 
      health: 'GET /health'
    }
  });
});

// Root endpoint with MCP info
app.get('/', (req, res) => {
  res.json({
    message: 'MCP Airbnb Protocol Server',
    version: '1.0.0',
    protocol: 'Model Context Protocol (MCP) 2024-11-05',
    description: 'MCP server for Airbnb search and listing details',
    endpoints: {
      mcp_sse: 'GET /mcp - Server-Sent Events endpoint',
      mcp_rpc: 'POST /mcp - JSON-RPC endpoint',
      health: 'GET /health - Health check'
    },
    tools: MCP_TOOLS.map(tool => ({
      name: tool.name,
      description: tool.description
    })),
    usage: {
      n8n_mcp_client: 'Use GET /mcp as SSE endpoint in n8n MCP Client node',
      example_tools: [
        {
          name: 'airbnb_search',
          params: { location: 'Miami Beach', adults: 2 }
        },
        {
          name: 'airbnb_listing_details', 
          params: { id: 'mcp-1' }
        }
      ]
    }
  });
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 MCP Airbnb Protocol Server running on port ${port}`);
  console.log(`📡 MCP SSE Endpoint: http://localhost:${port}/mcp`);
  console.log(`🔧 MCP RPC Endpoint: POST http://localhost:${port}/mcp`);
  console.log(`❤️  Health check: http://localhost:${port}/health`);
  console.log(`📖 Documentation: http://localhost:${port}/`);
  console.log(`🌐 Protocol: Model Context Protocol (MCP) 2024-11-05`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});
