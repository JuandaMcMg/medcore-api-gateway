const express = require('express');
const axios = require('axios');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// URLs de los servicios desde variables de entorno
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3002';
const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3003';
const ORGANIZATION_SERVICE_URL = process.env.ORGANIZATION_SERVICE_URL || 'http://localhost:3004';
const MEDICAL_RECORDS_SERVICE_URL = process.env.MEDICAL_RECORDS_SERVICE_URL || 'http://localhost:3005';
const AUDIT_SERVICE_URL = process.env.AUDIT_SERVICE_URL || 'http://localhost:3006';

// Middleware básico
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3001", "https://medcore-api-gateway-ms.vercel.app"],
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
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    services: {
      auth: AUTH_SERVICE_URL,
      user: USER_SERVICE_URL,
      organization: ORGANIZATION_SERVICE_URL,
      medicalRecords: MEDICAL_RECORDS_SERVICE_URL,
      audit: AUDIT_SERVICE_URL
    }
  });
});

// Rutas específicas para Auth Service
app.post('/api/v1/auth/sign-in', proxyToAuthService);
app.post('/api/v1/auth/sign-up', proxyToAuthService);
app.post('/api/v1/auth/verify-email', proxyToAuthService);
app.post('/api/v1/auth/resend-verification', proxyToAuthService);
app.post('/api/v1/auth/logout', proxyToAuthService);
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
app.put('/api/v1/users/:id/password', proxyToUserService);

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
  const authServiceUrl = `${AUTH_SERVICE_URL}${req.originalUrl}`;
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
      timeout: 15000 // Aumentamos el timeout para conexiones externas
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
        details: error.message,
        serviceUrl: AUTH_SERVICE_URL
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
  const userServiceUrl = `${USER_SERVICE_URL}${req.originalUrl}`;
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
      timeout: 15000 // Aumentamos el timeout para conexiones externas
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
        details: error.message,
        serviceUrl: USER_SERVICE_URL
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
  const organizationServiceUrl = `${ORGANIZATION_SERVICE_URL}${req.originalUrl}`;
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
      timeout: 15000
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
        details: error.message,
        serviceUrl: ORGANIZATION_SERVICE_URL
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
  const medicalRecordsServiceUrl = `${MEDICAL_RECORDS_SERVICE_URL}${req.originalUrl}`;
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
      timeout: 15000
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
        details: error.message,
        serviceUrl: MEDICAL_RECORDS_SERVICE_URL
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
  const auditServiceUrl = `${AUDIT_SERVICE_URL}${req.originalUrl}`;
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
      timeout: 15000
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
        details: error.message,
        serviceUrl: AUDIT_SERVICE_URL
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
  console.log(`   - Auth Service: ${AUTH_SERVICE_URL}`);
  console.log(`   - User Service: ${USER_SERVICE_URL}`);
  console.log(`   - Organization Service: ${ORGANIZATION_SERVICE_URL}`);
  console.log(`   - Medical Records Service: ${MEDICAL_RECORDS_SERVICE_URL}`);
  console.log(`   - Audit Service: ${AUDIT_SERVICE_URL}`);
});

module.exports = app;