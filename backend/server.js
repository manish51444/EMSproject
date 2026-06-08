import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import swaggerUi from 'swagger-ui-express';
import connectDB from './config/database.js';
import validateEnv from './config/envValidation.js';
import swaggerSpec from './config/swagger.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import { requestId } from './middleware/requestId.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Routes
import authRoutes from './routes/auth.js';
import organizationRoutes from './routes/organizations.js';
import projectRoutes from './routes/projects.js';
import issueRoutes from './routes/issues.js';
import commentRoutes from './routes/comments.js';
import userRoutes from './routes/users.js';
import workLogRoutes from './routes/worklogs.js';
import formRoutes from './routes/forms.js';
import attachmentRoutes from './routes/attachments.js';
import reportRoutes from './routes/reports.js';

import shortcutRoutes from './routes/shortcuts.js';
import sprintRoutes from './routes/sprints.js';
import microsoftRoutes from './routes/microsoft.js';
import filterRoutes from './routes/filters.js';
import dashboardRoutes from './routes/dashboard.js';

dotenv.config();

// Validate environment variables
validateEnv();

// Only connect to DB if not in test mode
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  },
});

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"], // Added for Socket.io
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.FRONTEND_URL 
      ? process.env.FRONTEND_URL.split(',').map(url => url.trim())
      : (process.env.NODE_ENV === 'production' ? [] : ['http://localhost:5173']);
    
    // In production, require origin header for security
    // Only allow no-origin requests in development (for testing)
    if (!origin) {
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('CORS: Origin header required in production'));
      }
      // Development: allow no-origin for testing tools
      return callback(null, true);
    }
    
    // Validate origin against allowed list
    if (allowedOrigins.length === 0) {
      // No FRONTEND_URL configured - deny all in production
      if (process.env.NODE_ENV === 'production') {
        return callback(new Error('CORS: No allowed origins configured'));
      }
      // Development fallback
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200, // Some legacy browsers (IE11) choke on 204
};

app.use(cors(corsOptions));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Global Middleware
app.use(requestId); // Add Request ID
app.use(cookieParser());

// Body size limits from environment or defaults
const maxBodySize = process.env.MAX_BODY_SIZE || '10mb';
app.use(express.json({ limit: maxBodySize }));
app.use(express.urlencoded({ extended: true, limit: maxBodySize }));
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    requestId: req.id
  });
});

// Serve static files from uploads directory
app.use('/api/uploads', express.static(join(__dirname, 'uploads')));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'EMS API Documentation',
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/worklogs', workLogRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/shortcuts', shortcutRoutes);
app.use('/api/sprints', sprintRoutes);
app.use('/api/microsoft', microsoftRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Socket.io for real-time updates
io.on('connection', (socket) => {
  // console.log('User connected:', socket.id); // Quieted for tests

  socket.on('join-project', (projectId) => {
    socket.join(`project-${projectId}`);
  });

  socket.on('leave-project', (projectId) => {
    socket.leave(`project-${projectId}`);
  });

  socket.on('disconnect', () => {
    // console.log('User disconnected:', socket.id);
  });
});

// Make io available to routes
app.set('io', io);

// Error handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Only listen if not in test mode
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  });
}

export { app, httpServer };
