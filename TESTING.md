# 🧪 SocialDrop - Testing Guide

Guía completa para ejecutar y validar todas las implementaciones de SocialDrop.

## 📋 Tabla de Contenidos

1. [Smart Contract Tests](#smart-contract-tests)
2. [Validación Manual de Features](#validación-manual-de-features)
3. [Tests de Performance](#tests-de-performance)
4. [Checklist Pre-Producción](#checklist-pre-producción)

---

## 🔐 Smart Contract Tests

### Ejecutar Tests del Contrato

```bash
# Instalar dependencias (primera vez)
yarn install

# Ejecutar todos los tests
yarn hardhat:test

# Ejecutar con reporte de gas
REPORT_GAS=true yarn hardhat:test

# Ejecutar tests específicos
yarn hardhat test test/EvolvingNFT.test.ts

# Ejecutar con coverage
yarn hardhat coverage
```

### Test Suite del Contrato EvolvingNFT

**Ubicación:** `packages/hardhat/test/EvolvingNFT.test.ts`

**Cobertura:**
- ✅ Deployment y configuración inicial
- ✅ Minting (owner only, sequential IDs, eventos)
- ✅ Evolution (incremento de nivel, tokenURI update, eventos)
- ✅ TokenURI (generación dinámica, niveles múltiples)
- ✅ Base URI management (update, ownership)
- ✅ Ownership transfer
- ✅ ERC721 compliance (transfers, approvals)
- ✅ Gas optimization (benchmarks)
- ✅ Edge cases (zero address, non-existent tokens)

**Casos de Prueba:** 30+ tests

**Resultado Esperado:**
```
  EvolvingNFT
    Deployment
      ✓ Should set the correct name and symbol
      ✓ Should set the deployer as owner
      ✓ Should initialize with no tokens minted
    Minting
      ✓ Should allow owner to mint NFT
      ✓ Should start at level 1
      ✓ Should return correct tokenURI for level 1
      ✓ Should mint multiple NFTs with sequential IDs
      ✓ Should NOT allow non-owner to mint
      ✓ Should emit Transfer event on mint
    Evolution
      ✓ Should allow owner to evolve NFT
      ✓ Should update tokenURI after evolution
      ✓ Should emit NFT_Evolved event
      ✓ Should allow multiple evolutions
      ✓ Should NOT allow non-owner to evolve
      ✓ Should revert when evolving non-existent token
      ✓ Should preserve ownership after evolution
    ...

  30 passing (2s)
```

---

## ✅ Validación Manual de Features

### 1. Sistema de Evolución Automática

**Endpoint:** `GET /api/cron/check-evolutions`

**Prueba Manual:**

```bash
# 1. Configurar CRON_SECRET en .env
echo "CRON_SECRET=test-secret-123" >> .env

# 2. Ejecutar manualmente
curl -H "Authorization: Bearer test-secret-123" \
  http://localhost:3000/api/cron/check-evolutions

# Respuesta esperada:
{
  "success": true,
  "summary": {
    "total": X,
    "successful": Y,
    "failed": 0
  },
  "evolutions": [...]
}
```

**Validaciones:**
- [ ] Se ejecuta sin errores
- [ ] Detecta NFTs elegibles para evolución
- [ ] Actualiza nivel en blockchain
- [ ] Actualiza nivel en base de datos
- [ ] Publica cast de celebración

### 2. Sistema de Caché

**Endpoint:** `GET /api/admin/cache`

**Prueba Manual:**

```bash
# Obtener estadísticas de caché
curl http://localhost:3000/api/admin/cache

# Respuesta esperada:
{
  "success": true,
  "stats": {
    "campaigns": { "hits": 245, "misses": 12, "hitRate": 0.95 },
    "users": { "hits": 890, "misses": 34, "hitRate": 0.96 },
    ...
  }
}

# Limpiar cach\u00e9s expirados
curl -X POST http://localhost:3000/api/admin/cache \
  -H "Content-Type: application/json" \
  -d '{"action":"cleanup"}'

# Limpiar todo el caché (usar con cuidado)
curl -X POST http://localhost:3000/api/admin/cache \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}'
```

**Validaciones:**
- [ ] Hit rate > 70% después de uso normal
- [ ] Cleanup elimina entradas expiradas
- [ ] Clear vacía todos los caches
- [ ] Stats reflejan uso real

### 3. Rate Limiting

**Endpoints con Rate Limit:**
- `/api/claim` - 10 req/min
- `/api/leaderboard/*` - 60 req/min

**Prueba Manual:**

```bash
# Test claim rate limit (debe fallar en request #11)
for i in {1..15}; do
  echo "Request $i:"
  curl -X POST http://localhost:3000/api/claim \
    -H "Content-Type: application/json" \
    -d '{"userFid":123,"campaignId":1}' \
    -i | grep -E "HTTP|X-RateLimit"
  sleep 1
done

# Respuesta esperada después de 10 requests:
HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2025-11-11T15:30:00.000Z
Retry-After: 30
```

**Validaciones:**
- [ ] Límites aplicados correctamente
- [ ] Headers informativos presentes
- [ ] Retry-After calculado correctamente
- [ ] Diferentes límites por endpoint

### 4. Webhook Security

**Endpoint:** `POST /api/webhooks/neynar`

**Prueba Manual:**

```bash
# Test 1: Sin firma (debe rechazar)
curl -X POST http://localhost:3000/api/webhooks/neynar \
  -H "Content-Type: application/json" \
  -d '{"data":{"fid":123,"cast":{"hash":"0xabc"}}}'

# Respuesta esperada:
{"message":"Invalid webhook signature"}

# Test 2: Con firma válida (requiere NEYNAR_WEBHOOK_SECRET)
# La firma se calcula con HMAC-SHA512
```

**Validaciones:**
- [ ] Rechaza requests sin firma
- [ ] Rechaza requests con firma inválida
- [ ] Acepta requests con firma válida
- [ ] Valida estructura de datos

### 5. Leaderboard Optimizado

**Endpoint:** `GET /api/leaderboard/[campaignId]`

**Prueba Manual:**

```bash
# Test paginación
curl "http://localhost:3000/api/leaderboard/1?page=1&limit=5"

# Respuesta esperada:
{
  "campaignId": 1,
  "campaignName": "...",
  "totalParticipants": 50,
  "leaderboard": [
    {
      "rank": 1,
      "username": "user1",
      "score": 250,
      "level": 3,
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 50,
    "hasMore": true
  }
}

# Test caché (segunda request debe ser más rápida)
time curl "http://localhost:3000/api/leaderboard/1"
time curl "http://localhost:3000/api/leaderboard/1"
```

**Validaciones:**
- [ ] Paginación funciona correctamente
- [ ] Datos ordenados por score DESC
- [ ] Incluye información de usuario enriquecida
- [ ] Cache-Control headers presentes
- [ ] Segunda request más rápida (cached)

### 6. Metadatos NFT Enriquecidos

**Endpoint:** `GET /api/metadata/[level]`

**Prueba Manual:**

```bash
# Test diferentes niveles
for level in 1 2 3 4; do
  echo "Level $level:"
  curl "http://localhost:3000/api/metadata/$level" | jq .
done

# Validar estructura esperada
curl "http://localhost:3000/api/metadata/1" | jq '{
  name,
  description,
  attributes: .attributes | map(.trait_type),
  rarity: .attributes[] | select(.trait_type=="Rarity") | .value
}'
```

**Validaciones:**
- [ ] Descripciones únicas por nivel
- [ ] Rarity correcta (Common, Uncommon, Rare, Legendary)
- [ ] Stats crecen con el nivel
- [ ] Background color diferente por nivel
- [ ] OpenSea-compatible

### 7. Finalización de Campañas

**Prueba Manual:**

```bash
# Simular campaña que alcanza max_mints
# Esto se activa automáticamente en el webhook cuando:
# mint_count >= max_mints

# Verificar en logs:
# "Controlador: La campaña X ha alcanzado su límite de mints"
# "Campaign Completion: Finalizando campaña X"
```

**Validaciones:**
- [ ] Campaña marcada como is_active = false
- [ ] Cast de anuncio publicado con stats
- [ ] Top 3 notificados
- [ ] No se permiten más mints

---

## ⚡ Tests de Performance

### Benchmarks Esperados

**Caché Performance:**
```
Sin caché:
- Campaign lookup: ~50-100ms
- User data lookup: ~150-200ms
- Likes count: ~100-150ms

Con caché (hit):
- Campaign lookup: ~1-2ms (98% más rápido)
- User data lookup: ~1-2ms (99% más rápido)
- Likes count: ~1-2ms (99% más rápido)
```

**Rate Limiting Overhead:**
```
- Sin rate limit: ~5ms
- Con rate limit: ~6ms (<1ms overhead)
```

**Leaderboard:**
```
- Primera request: ~200-300ms (DB query + enrich)
- Requests cacheadas: ~10-20ms
- Cache TTL: 30 segundos
```

---

## 📋 Checklist Pre-Producción

### Configuración

- [ ] Todas las variables de entorno configuradas en Vercel
  - `NEYNAR_API_KEY`
  - `NEYNAR_API_KEY_PERSONAL`
  - `NEYNAR_SIGNER_UUID`
  - `NEYNAR_WEBHOOK_SECRET`
  - `CRON_SECRET`
  - `DEPLOYER_PRIVATE_KEY`
  - `DATABASE_URL`
  - `DIRECT_URL`

### Smart Contract

- [ ] Tests pasando al 100%
- [ ] Gas optimization validado
- [ ] Auditoría de seguridad realizada
- [ ] Deployed en mainnet
- [ ] Verified en Basescan
- [ ] Base URI configurada correctamente

### Backend

- [ ] Todos los endpoints funcionando
- [ ] Cache funcionando con hit rate > 70%
- [ ] Rate limiting aplicado
- [ ] Webhook validation activa
- [ ] Cron jobs configurados en Vercel
- [ ] Error handling robusto
- [ ] Logging configurado

### Neynar Integration

- [ ] Webhook configurado en Neynar Dashboard
- [ ] Apuntando a URL de producción
- [ ] Webhook secret configurado
- [ ] Signer UUID válido
- [ ] API keys con límites suficientes

### Base de Datos

- [ ] Migrations aplicadas
- [ ] Índices creados
- [ ] Backup configurado
- [ ] Connection pooling activo

### Monitoreo

- [ ] Vercel analytics activo
- [ ] Error tracking (Sentry recomendado)
- [ ] Cache stats monitoring
- [ ] Rate limit monitoring

---

## 🐛 Troubleshooting

### Tests Failing

```bash
# Limpiar y reinstalar
yarn clean
rm -rf node_modules
yarn install

# Compilar contratos
yarn hardhat:compile

# Ejecutar tests
yarn hardhat:test
```

### Cache Issues

```bash
# Limpiar todo el caché
curl -X POST http://localhost:3000/api/admin/cache \
  -d '{"action":"clear"}'

# Ver estadísticas
curl http://localhost:3000/api/admin/cache
```

### Rate Limit Issues

```bash
# Los rate limiters se limpian automáticamente
# Para testing local, reiniciar el servidor resetea los limiters
```

---

## 📚 Recursos

- [Hardhat Testing Docs](https://hardhat.org/tutorial/testing-contracts)
- [Chai Matchers](https://ethereum-waffle.readthedocs.io/en/latest/matchers.html)
- [OpenZeppelin Test Helpers](https://docs.openzeppelin.com/test-helpers/)
- [Neynar Webhooks](https://docs.neynar.com/docs/webhooks)

---

## 🎯 Próximos Tests a Implementar

1. **Integration Tests** - Testing completo del flujo claim → mint → evolve
2. **Load Testing** - Simular múltiples usuarios simultáneos
3. **E2E Tests** - Playwright para frontend
4. **Security Tests** - Fuzzing del contrato con Echidna

---

**Última actualización:** 2025-11-11
**Versión:** Sprint 3
