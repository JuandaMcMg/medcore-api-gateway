# MedCore API Gateway

Este servicio actúa como puerta de enlace (API Gateway) para todos los microservicios de MedCore, enrutando las peticiones de los clientes a los servicios correspondientes.

## Características

- Punto de entrada único para el frontend
- Enrutamiento dinámico a microservicios
- Manejo de autenticación común
- Balanceo de carga y gestión de fallos

## Tecnologías

- Node.js
- Express
- Axios
- CORS
- Helmet (Seguridad HTTP)

## Requisitos

- Node.js 14.x o superior
- NPM o Yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd api-gateway
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear archivo `.env` con las siguientes variables:
```
PORT=3001
AUTH_SERVICE_URL=http://localhost:3002
USER_MANAGEMENT_SERVICE_URL=http://localhost:3003
ORGANIZATION_SERVICE_URL=http://localhost:3004
MEDICAL_RECORDS_SERVICE_URL=http://localhost:3005
AUDIT_SERVICE_URL=http://localhost:3006
```

4. Iniciar el servicio:
```bash
npm run dev
```

## Despliegue en Vercel

1. Asegúrate de tener una cuenta en [Vercel](https://vercel.com/) y el CLI instalado:
```bash
npm i -g vercel
```

2. Iniciar sesión en Vercel:
```bash
vercel login
```

3. Configurar variables de entorno en Vercel:
   - Ve a la configuración de tu proyecto en Vercel
   - Añade las siguientes variables de entorno:
     - `PORT`
     - `AUTH_SERVICE_URL`
     - `USER_MANAGEMENT_SERVICE_URL`
     - `ORGANIZATION_SERVICE_URL`
     - `MEDICAL_RECORDS_SERVICE_URL`
     - `AUDIT_SERVICE_URL`

4. Desplegar el servicio:
```bash
vercel --prod
```

## Estructura del Proyecto

- `src/index.js`: Punto de entrada de la aplicación
- `src/routes/`: Definiciones de rutas para los diferentes servicios
- `src/middlewares/`: Middleware de autenticación, CORS, etc.
- `src/config/`: Configuraciones del servicio

## API Endpoints

El API Gateway expone endpoints que redirigen a los microservicios:

- `/api/auth/*` -> Auth Service
- `/api/users/*` -> User Management Service 
- `/api/organization/*` -> Organization Service
- `/api/medical-records/*` -> Medical Records Service
- `/api/audit/*` -> Audit Service