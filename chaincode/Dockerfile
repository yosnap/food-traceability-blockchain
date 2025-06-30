# Dockerfile para Chaincode as a Service (CCAAS)
FROM node:18-alpine

# Variables de entorno para CCAAS
ARG CC_SERVER_PORT
ENV PORT=${CC_SERVER_PORT}
ENV CHAINCODE_SERVER_ADDRESS=0.0.0.0:${CC_SERVER_PORT}
ENV CHAINCODE_ID_NAME=food-traceability

# Crear directorio de trabajo
WORKDIR /usr/src/app

# Instalar dependencias del sistema necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    pkgconfig \
    pixman-dev \
    cairo-dev \
    pango-dev \
    libjpeg-turbo-dev \
    giflib-dev

# Copiar archivos de configuración
COPY package*.json ./
COPY tsconfig.json ./

# Instalar todas las dependencias (incluyendo devDependencies para compilar)
RUN npm ci

# Copiar código fuente
COPY src/ ./src/

# Compilar TypeScript
RUN npm run build

# No hacer prune porque fabric-chaincode-node está en devDependencies pero es necesario para CCAAS
# RUN npm prune --production

# Exponer puerto del chaincode
EXPOSE ${CC_SERVER_PORT}

# Comando para iniciar el chaincode server usando fabric-chaincode-node
CMD ["npm", "start"]