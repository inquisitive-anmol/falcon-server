# Backend Server with Centralized Error Handling

This backend server implements a comprehensive centralized error handling system that provides consistent error responses, logging, and debugging capabilities.

## Features

- **Custom Error Classes**: Predefined error types for common scenarios
- **Global Error Handler**: Centralized error processing middleware
- **Async Error Wrapper**: Automatic async error catching
- **Request Logging**: HTTP request/response logging
- **File-based Logging**: Persistent error logs
- **Security Middleware**: CORS, Helmet, Rate limiting
- **Environment-aware**: Different error responses for dev/prod
- **Database Integration**: MongoDB connection with health checks
- **Centralized Configuration**: Environment-based configuration management
- **Graceful Shutdown**: Proper server and database cleanup

## Project Structure

```
backend/
├── server.js                # Server entry point
├── index.js                 # Express app configuration
├── package.json            # Dependencies and scripts
├── config/
│   ├── server.js           # Centralized configuration
│   └── database.js         # Database connection management
├── utils/
│   ├── errors.js           # Custom error classes
│   ├── errorHandler.js     # Error handling middleware
│   └── logger.js           # Logging utility
├── routes/
│   └── index.js            # Example routes
└── logs/                   # Generated log files
    ├── ERROR.log
    ├── WARN.log
    ├── INFO.log
    └── DEBUG.log
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```env
NODE_ENV=development
PORT=5000
HOST=localhost
CLIENT_URL=http://localhost:3000

# Database Configuration (optional)
MONGODB_URI=mongodb://localhost:27017/falcons_website

# JWT Configuration (if using authentication)
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=90d

# Rate Limiting
RATE_LIMIT_MAX=100

# Logging
LOG_LEVEL=info
```

3. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

## Server Architecture

### Entry Point (`server.js`)
- Server initialization and startup
- Database connection management
- Graceful shutdown handling
- Process signal handling

### App Configuration (`index.js`)
- Express app setup
- Middleware configuration
- Route registration
- Error handling setup

### Configuration (`config/server.js`)
- Centralized environment configuration
- Security settings
- Database settings
- External service configurations

### Database (`config/database.js`)
- MongoDB connection management
- Connection health monitoring
- Automatic reconnection
- Graceful disconnection

## Error Handling System

### Custom Error Classes

The system provides several custom error classes for different scenarios:

```javascript
const { 
  AppError, 
  ValidationError, 
  AuthenticationError, 
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  ExternalServiceError
} = require('./utils/errors');

// Usage examples:
throw new ValidationError('Invalid input data', [
  { field: 'email', message: 'Email is required' }
]);

throw new NotFoundError('User');

throw new AuthenticationError('Invalid credentials');
```

### Using the Error Handler in Routes

Wrap your route handlers with `catchAsync` to automatically catch async errors:

```javascript
const { catchAsync } = require('../utils/errorHandler');

router.get('/users/:id', catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  
  if (!user) {
    throw new NotFoundError('User');
  }
  
  res.status(200).json({
    status: 'success',
    data: { user }
  });
}));
```

### Error Response Format

**Development Mode:**
```json
{
  "status": "fail",
  "error": {
    "name": "ValidationError",
    "message": "Invalid input data",
    "stack": "..."
  },
  "message": "Invalid input data",
  "stack": "..."
}
```

**Production Mode:**
```json
{
  "status": "fail",
  "message": "Invalid input data"
}
```

## Logging System

The logger provides different log levels and file-based persistence:

```javascript
const logger = require('./utils/logger');

logger.info('User logged in', { userId: 123 });
logger.warn('Rate limit exceeded', { ip: '192.168.1.1' });
logger.error('Database connection failed', { error: err.message });
logger.debug('Processing request', { method: 'GET', url: '/api/users' });
```

### Log Files

- `ERROR.log`: All error-level messages
- `WARN.log`: All warning-level messages  
- `INFO.log`: All info-level messages
- `DEBUG.log`: Debug messages (development only)

## API Endpoints

### Health Check
```
GET /health
```

Returns comprehensive health status including:
- Server status
- Database connection status
- Memory usage
- Uptime
- Environment information

### Example Routes
```
GET  /api/test              # Basic test route
GET  /api/error-example     # Demonstrates error throwing
POST /api/validation-example # Validation error example
GET  /api/not-found/:id     # Not found error example
GET  /api/protected         # Authentication error example
GET  /api/async-error       # Async error handling example
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment (development/production) | development |
| `PORT` | Server port | 5000 |
| `HOST` | Server host | localhost |
| `CLIENT_URL` | Allowed CORS origin | http://localhost:3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/falcons_website |
| `JWT_SECRET` | JWT signing secret | your-super-secret-jwt-key-here |
| `RATE_LIMIT_MAX` | Rate limit requests per window | 100 |
| `LOG_LEVEL` | Logging level | info |
| `EMAIL_HOST` | SMTP server host | (required) |
| `EMAIL_PORT` | SMTP server port | 587 |
| `EMAIL_SECURE` | Use TLS/SSL (true/false) | false |
| `EMAIL_USER` | SMTP username | (required) |
| `EMAIL_PASS` | SMTP password | (required) |
| `EMAIL_FROM` | From address (optional) | EMAIL_USER |

### Configuration Categories

- **Server**: Port, host, environment settings
- **Security**: CORS, rate limiting, body parsing
- **Database**: MongoDB connection and options
- **JWT**: Authentication token settings
- **Upload**: File upload configuration
- **Logging**: Log levels and file settings
- **External**: External service configurations

## Security Features

- **Helmet**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: Configurable requests per time window
- **Body Size Limits**: Configurable request body limits
- **Environment Validation**: Required variable checking in production

## Database Integration

### Connection Management
- Automatic connection on server startup
- Connection health monitoring
- Automatic reconnection on disconnection
- Graceful disconnection on shutdown

### Health Checks
- Database ping on health endpoint
- Connection status monitoring
- Detailed health information

## Best Practices

1. **Always use `catchAsync`** for async route handlers
2. **Use specific error classes** instead of generic errors
3. **Log errors appropriately** using the logger utility
4. **Handle operational vs programming errors** differently
5. **Provide meaningful error messages** to clients
6. **Use environment variables** for configuration
7. **Monitor health endpoints** for system status
8. **Implement graceful shutdown** for clean deployments

## Error Types

### Operational Errors (isOperational: true)
- ValidationError (400)
- AuthenticationError (401)
- AuthorizationError (403)
- NotFoundError (404)
- ConflictError (409)

### Programming Errors (isOperational: false)
- DatabaseError (500)
- ExternalServiceError (502)

## Testing the Error System

You can test different error scenarios using the example routes:

```bash
# Test validation error
curl -X POST http://localhost:5000/api/validation-example \
  -H "Content-Type: application/json" \
  -d '{}'

# Test not found error
curl http://localhost:5000/api/not-found/999

# Test authentication error
curl http://localhost:5000/api/protected

# Test async error
curl http://localhost:5000/api/async-error

# Test health check
curl http://localhost:5000/health
```

## Monitoring and Debugging

1. **Check log files** in the `logs/` directory
2. **Monitor console output** for real-time errors
3. **Use health check endpoint** for server and database status
4. **Review error responses** for debugging information
5. **Monitor database connection** status

## Deployment

### Production Checklist
- [ ] Set `NODE_ENV=production`
- [ ] Configure required environment variables
- [ ] Set up MongoDB connection string
- [ ] Configure JWT secret
- [ ] Set up proper logging
- [ ] Configure CORS origins
- [ ] Set up monitoring and health checks

### Docker Support
The server is ready for containerization with proper environment variable configuration.

## Contributing

When adding new routes or functionality:

1. Import the error handling utilities
2. Use `catchAsync` for async operations
3. Throw appropriate custom errors
4. Add logging where necessary
5. Test error scenarios
6. Update configuration if needed
7. Add health checks for new services 