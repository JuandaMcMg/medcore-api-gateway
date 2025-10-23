
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware básico
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check del API Gateway
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    ts: new Date().toISOString(),
    service: 'api-gateway',
    port: PORT
  });
});

// Rutas específicas para Auth Service
app.post('/api/v1/auth/sign-in', proxyToAuthService);
app.post('/api/v1/auth/sign-up', proxyToAuthService);
app.post('/api/v1/auth/verify-email', proxyToAuthService);
app.get('/api/v1/auth/health', proxyToAuthService);

// Rutas específicas para User Service
app.get('/api/v1/users', proxyToUserService);
app.post('/api/v1/users', proxyToUserService);
app.get('/api/v1/users/:id', proxyToUserService);
app.put('/api/v1/users/:id', proxyToUserService);
app.delete('/api/v1/users/:id', proxyToUserService);
app.get('/api/v1/users/health', proxyToUserService);
app.patch('/api/v1/users/:id/deactivate', proxyToUserService);
app.patch('/api/v1/users/:id/activate', proxyToUserService);
app.patch('/api/v1/user/:id/toggle-status',proxyToUserService)
app.put('/api/v1/users/:id/password', proxyToUserService);
app.get('/api/v1/users/by-role', proxyToUserService);
app.put('/api/v1/users/doctors/:id', proxyToUserService);
app.put('/api/v1/users/nurses/:id', proxyToUserService);
app.patch('/api/v1/users/doctors/state/:id', proxyToUserService);
app.patch('/api/v1/users/nurses/state/:id', proxyToUserService);
app.put('/api/v1/users/doctors/:id', proxyToUserService);
app.put('/api/v1/users/nurses/:id', proxyToUserService);
app.post('/api/v1/users/bulk-import', proxyToUserService);

// Rutas para Organization Service
app.use('/api/v1/affiliations', proxyToOrganizationService);
app.use('/api/v1/departments', proxyToOrganizationService);
app.use('/api/v1/specialities', proxyToOrganizationService);

// Rutas para Medical Records Service
app.use('/api/v1/patients', proxyToMedicalRecordsService);
app.use('/api/v1/diagnostics', proxyToMedicalRecordsService);
app.use('/api/v1/medical-records', proxyToMedicalRecordsService);

// Rutas para Audit Service
app.use('/api/v1/audit', proxyToAuditService);

// Función para manejar las solicitudes a Auth Service
async function proxyToAuthService(req, res) {
  const authServiceUrl = `http://localhost:3002${req.originalUrl}`;
  console.log(`🔄 [API-GATEWAY] Forwarding ${req.method} ${req.originalUrl} to Auth Service: ${authServiceUrl}`);
  
  try {
    // Preparar headers incluyendo Authorization si está presente
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Transferir encabezados de autorización y otros importantes
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
      console.log('🔑 [API-GATEWAY] Forwarding Authorization header to Auth Service');
    }
    
    // Transferir otros headers que podrían ser relevantes
    ['accept', 'user-agent'].forEach(header => {
      if (req.headers[header]) {
        headers[header] = req.headers[header];
      }
    });
    
    const response = await axios({
      method: req.method,
      url: authServiceUrl,
      headers: headers,
      data: req.body,
      timeout: 10000 // Aumentamos el timeout a 10 segundos
    });
    
    console.log(`✅ [API-GATEWAY] Response from Auth Service: ${response.status}`);
    
    // Devolver la respuesta del servicio de autenticación
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ [API-GATEWAY] Error forwarding to Auth Service:', error.message);
    
    // Si hay una respuesta del servicio, devolver esa respuesta
    if (error.response) {
      console.log('📝 [API-GATEWAY] Error response:', error.response.status, error.response.data);
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Service Unavailable',
        message: 'Auth Service is not available',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Error in API Gateway',
        details: error.message
      });
    }
  }
}

// Función para manejar las solicitudes a User Service
async function proxyToUserService(req, res) {
  const userServiceUrl = `http://localhost:3003${req.originalUrl}`;
  console.log(`🔄 [API-GATEWAY] Forwarding ${req.method} ${req.originalUrl} to User Service: ${userServiceUrl}`);
  
  try {
    // Preparar headers incluyendo Authorization si está presente
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Pasar el token de autorización si existe
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
      console.log('🔑 [API-GATEWAY] Forwarding Authorization header to User Service');
    } else {
      console.log('⚠️ [API-GATEWAY] No Authorization header present in request');
    }
    
    // Simplificamos para evitar problemas de manejo de streams
    const response = await axios({
      method: req.method,
      url: userServiceUrl,
      headers: headers,
      data: req.body,
      timeout: 10000 // Aumentamos el timeout a 10 segundos
    });
    
    console.log(`✅ [API-GATEWAY] Response from User Service: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ [API-GATEWAY] Error forwarding to User Service:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Service Unavailable',
        message: 'User Service is not available',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Error in API Gateway',
        details: error.message
      });
    }
  }
}

// Función para manejar las solicitudes a Organization Service
async function proxyToOrganizationService(req, res) {
  const organizationServiceUrl = `http://localhost:3004${req.originalUrl}`;
  console.log(`🔄 [API-GATEWAY] Forwarding ${req.method} ${req.originalUrl} to Organization Service: ${organizationServiceUrl}`);
  
  try {
    // Preparar headers incluyendo Authorization
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Transferir encabezados de autorización y otros importantes
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
      console.log('🔑 [API-GATEWAY] Forwarding Authorization header to Organization Service');
    } else {
      console.log('⚠️ [API-GATEWAY] No Authorization header present in request to Organization Service');
    }
    
    // Transferir otros headers relevantes
    ['accept', 'user-agent'].forEach(header => {
      if (req.headers[header]) {
        headers[header] = req.headers[header];
      }
    });
    
    const response = await axios({
      method: req.method,
      url: organizationServiceUrl,
      headers: headers,
      data: req.body,
      timeout: 10000
    });
    
    console.log(`✅ [API-GATEWAY] Response from Organization Service: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ [API-GATEWAY] Error forwarding to Organization Service:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Service Unavailable',
        message: 'Organization Service is not available',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Error in API Gateway',
        details: error.message
      });
    }
  }
}

// Función para manejar las solicitudes a Medical Records Service
async function proxyToMedicalRecordsService(req, res) {
  const medicalRecordsServiceUrl = `http://localhost:3005${req.originalUrl}`;
  console.log(`🔄 [API-GATEWAY] Forwarding ${req.method} ${req.originalUrl} to Medical Records Service: ${medicalRecordsServiceUrl}`);
  
  try {
    // Preparar headers incluyendo Authorization
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Transferir encabezados de autorización y otros importantes
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
      console.log('🔑 [API-GATEWAY] Forwarding Authorization header to Medical Records Service');
    } else {
      console.log('⚠️ [API-GATEWAY] No Authorization header present in request to Medical Records Service');
    }
    
    // Transferir otros headers relevantes
    ['accept', 'user-agent'].forEach(header => {
      if (req.headers[header]) {
        headers[header] = req.headers[header];
      }
    });
    
    const response = await axios({
      method: req.method,
      url: medicalRecordsServiceUrl,
      headers: headers,
      data: req.body,
      timeout: 10000
    });
    
    console.log(`✅ [API-GATEWAY] Response from Medical Records Service: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ [API-GATEWAY] Error forwarding to Medical Records Service:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Service Unavailable',
        message: 'Medical Records Service is not available',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Error in API Gateway',
        details: error.message
      });
    }
  }
}

// Función para manejar las solicitudes a Audit Service
async function proxyToAuditService(req, res) {
  const auditServiceUrl = `http://localhost:3006${req.originalUrl}`;
  console.log(`🔄 [API-GATEWAY] Forwarding ${req.method} ${req.originalUrl} to Audit Service: ${auditServiceUrl}`);
  
  try {
    // Preparar headers incluyendo Authorization
    const headers = {
      'Content-Type': 'application/json',
    };
    
    // Transferir encabezados de autorización y otros importantes
    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization;
      console.log('🔑 [API-GATEWAY] Forwarding Authorization header to Audit Service');
    } else {
      console.log('⚠️ [API-GATEWAY] No Authorization header present in request to Audit Service');
    }
    
    // Transferir otros headers relevantes
    ['accept', 'user-agent'].forEach(header => {
      if (req.headers[header]) {
        headers[header] = req.headers[header];
      }
    });
    
    const response = await axios({
      method: req.method,
      url: auditServiceUrl,
      headers: headers,
      data: req.body,
      timeout: 10000
    });
    
    console.log(`✅ [API-GATEWAY] Response from Audit Service: ${response.status}`);
    res.status(response.status).json(response.data);
  } catch (error) {
    console.error('❌ [API-GATEWAY] Error forwarding to Audit Service:', error.message);
    
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      res.status(503).json({ 
        error: 'Service Unavailable',
        message: 'Audit Service is not available',
        details: error.message
      });
    } else {
      res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'Error in API Gateway',
        details: error.message
      });
    }
  }
}

// Default route para cualquier otra petición
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not Found', 
    message: `Route ${req.originalUrl} not found in API Gateway` 
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  console.log('🔗 Proxying to:');
  console.log('   - Auth Service: http://localhost:3002');
  console.log('   - User Service: http://localhost:3003');
  console.log('   - Organization Service: http://localhost:3004');
  console.log('   - Medical Records Service: http://localhost:3005');
  console.log('   - Audit Service: http://localhost:3006');
});

module.exports = app;
