#!/bin/bash

# Script para redesplegar el chaincode
echo "Desplegando chaincode food-traceability..."

cd ../fabric-samples/test-network

# Desplegar chaincode
./network.sh deployCC -ccn food-traceability -ccp ../../chaincode -ccl typescript -c mychannel -ccep "OR('Org1MSP.member')" -ccv 2.0

echo "Chaincode desplegado"