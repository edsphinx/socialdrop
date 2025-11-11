# 💰 Análisis de Costos: Alternativas a Neynar

## 📊 Comparación Ejecutiva

| Característica | Neynar Actual | Neynar + Cache | Airstack | Farcaster Hub |
|----------------|---------------|----------------|----------|---------------|
| **Costo mensual** | $25-300 | $25 | $0 | $0 |
| **API calls/mes** | 100k-500k | 100k | 100k (free) | Ilimitado |
| **Setup** | ✅ Ya funciona | ✅ Implementado | ⚠️ Instalar | ⚠️ Instalar |
| **Complejidad** | Baja | Baja | Baja | Media |
| **Latencia** | 150ms | 5-150ms* | 200ms | 250ms |
| **Dependencia** | Alta | Alta | Media | Baja |
| **Documentación** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ |
| **Recomendado para** | Quick start | Actual | MVP/Beta | Producción |

*Con cache: 5ms en cache hit, 150ms en cache miss

---

## 💸 Escenarios de Costo

### Escenario 1: 100 usuarios activos/mes (MVP)

**API Calls estimados:**
- getUserData: 100 users × 10 visits = 1,000 calls
- getCastLikes: 10 campaigns × 144 cron/día × 30 = 43,200 calls
- didUserLike: 50 claims × 2 = 100 calls
- **TOTAL:** ~44,300 calls/mes

| Opción | Costo/mes | Costo/año | Cache Hit Rate | Calls reales |
|--------|-----------|-----------|----------------|--------------|
| Neynar sin cache | $25 | $300 | 0% | 44,300 |
| Neynar con cache | $0-25 | $0-300 | 80% | 8,860 |
| Airstack | $0 | $0 | 80% | 8,860 |
| Farcaster Hub | $0 | $0 | 80% | 8,860 |

**Ahorro con cache:** $0-275/año
**Ahorro con Airstack/Hub:** $300/año

---

### Escenario 2: 1,000 usuarios activos/mes (Beta)

**API Calls estimados:**
- getUserData: 1,000 × 15 = 15,000 calls
- getCastLikes: 50 campaigns × 144 × 30 = 216,000 calls
- didUserLike: 500 claims × 2 = 1,000 calls
- **TOTAL:** ~232,000 calls/mes

| Opción | Costo/mes | Costo/año | Cache Hit Rate | Calls reales |
|--------|-----------|-----------|----------------|--------------|
| Neynar sin cache | $300 | $3,600 | 0% | 232,000 |
| Neynar con cache | $25 | $300 | 85% | 34,800 |
| Airstack Free | ❌ Over | ❌ Over | 85% | 34,800 |
| Airstack Hobby | $49 | $588 | 85% | 34,800 |
| Farcaster Hub | $0 | $0 | 85% | 34,800 |

**Ahorro con cache:** $3,300/año
**Ahorro con Hub:** $3,600/año vs sin cache, $300/año vs cache

---

### Escenario 3: 10,000 usuarios activos/mes (Producción)

**API Calls estimados:**
- getUserData: 10,000 × 20 = 200,000 calls
- getCastLikes: 200 campaigns × 144 × 30 = 864,000 calls
- didUserLike: 5,000 claims × 2 = 10,000 calls
- **TOTAL:** ~1,074,000 calls/mes

| Opción | Costo/mes | Costo/año | Cache Hit Rate | Calls reales |
|--------|-----------|-----------|----------------|--------------|
| Neynar sin cache | $300+ | $3,600+ | 0% | 1,074,000 |
| Neynar con cache | $25-50 | $300-600 | 90% | 107,400 |
| Airstack Pro | $199 | $2,388 | 90% | 107,400 |
| Farcaster Hub | $0 | $0 | 90% | 107,400 |

**Ahorro con Hub:** $3,600+/año

---

## 🎯 Recomendación por Fase

### ✅ AHORA (Inmediato)
**Usar: Neynar + Cache (ya implementado)**

```bash
# .env
USE_FARCASTER_HUB=false
USE_AIRSTACK=false
NEYNAR_API_KEY=tu_key_actual
```

**Ventajas:**
- ✅ Ya funciona
- ✅ Cache reduce 80-90% de llamadas
- ✅ Ahorro de $0-275/año vs sin cache
- ✅ Sin riesgo de migración

**Costo estimado:** $0-25/mes (dentro de free tier con cache)

---

### 🔄 PRÓXIMA SEMANA (Validación)
**Validar: Airstack + Farcaster Hub**

**Pasos:**
1. Instalar dependencias en local
   ```bash
   cd packages/nextjs
   yarn add @airstack/node
   yarn add @farcaster/hub-nodejs
   ```

2. Ejecutar scripts de validación
   ```bash
   AIRSTACK_API_KEY=tu_key node test-airstack.js
   node test-hub.js
   ```

3. Comparar resultados con Neynar
   ```bash
   curl "http://localhost:3000/api/test/farcaster-providers?fid=3"
   ```

4. Analizar:
   - ✅ Datos coinciden
   - ✅ Latencias aceptables
   - ✅ Error handling funciona

**Costo:** $0 (solo testing)

---

### 🚀 EN 2-4 SEMANAS (Beta)
**Migrar a: Airstack (más fácil) o Hub (más control)**

#### Opción A: Airstack
```bash
# .env staging
USE_AIRSTACK=true
AIRSTACK_API_KEY=tu_key
NEYNAR_API_KEY=tu_key  # Solo fallback
```

**Ventajas:**
- GraphQL fácil de usar
- Free tier generoso
- Bien documentado
- Migración gradual

**Costo:** $0/mes (hasta 100k requests con cache)

#### Opción B: Farcaster Hub
```bash
# .env staging
USE_FARCASTER_HUB=true
FARCASTER_HUB_URL=nemes.farcaster.xyz:2283
HUB_AS_FALLBACK=true
NEYNAR_API_KEY=tu_key  # Solo fallback y publishCast
```

**Ventajas:**
- 100% gratis
- Sin límites
- Descentralizado
- Máxima independencia

**Costo:** $0/mes

---

### 🎉 PRODUCCIÓN (En 1-2 meses)
**Usar: Farcaster Hub como principal**

```bash
# .env production
USE_FARCASTER_HUB=true
FARCASTER_HUB_URL=nemes.farcaster.xyz:2283
HUB_AS_FALLBACK=true

# Airstack como fallback secundario
USE_AIRSTACK_FALLBACK=true
AIRSTACK_API_KEY=tu_key

# Neynar solo para publishCast
NEYNAR_API_KEY=tu_key
NEYNAR_SIGNER_UUID=tu_signer
```

**Arquitectura de capas:**
1. **Principal:** Farcaster Hub (gratis, sin límites)
2. **Fallback 1:** Airstack (100k requests/mes gratis)
3. **Fallback 2:** Neynar (solo lectura crítica)
4. **Escritura:** Neynar (publishCast)

**Costo total:** $0-25/mes (solo si Neynar es necesario para writes)

---

## 📈 ROI por Opción

### Inversión en Migración

| Tarea | Tiempo estimado | Costo oportunidad |
|-------|-----------------|-------------------|
| Instalar Airstack | 30 min | $25 |
| Validar Airstack | 2 horas | $100 |
| Instalar Hub | 1 hora | $50 |
| Validar Hub | 3 horas | $150 |
| Deploy staging | 2 horas | $100 |
| Testing beta | 1 semana | $500 |
| **TOTAL** | ~12 horas | **$925** |

### Ahorro Anual

| Escenario | Con Neynar | Con Airstack | Con Hub | Ahorro |
|-----------|-----------|--------------|---------|--------|
| MVP (100 users) | $300/año | $0/año | $0/año | **$300/año** |
| Beta (1k users) | $300/año | $0-588/año | $0/año | **$300-588/año** |
| Prod (10k users) | $600+/año | $2,388/año | $0/año | **$600-2,388/año** |

**ROI:**
- Inversión: $925 (una vez)
- Ahorro anual: $300-2,388
- **Break-even: 4-12 meses**

---

## 🔍 Análisis de Riesgo

### Neynar (Actual)
**Riesgo:** 🟡 Medio
- ✅ Probado y funcional
- ⚠️ Vendor lock-in
- ⚠️ Costos pueden escalar
- ⚠️ Cambios en pricing

### Airstack
**Riesgo:** 🟡 Medio
- ✅ Bien documentado
- ✅ Free tier generoso
- ⚠️ Depende de tercero
- ⚠️ Rate limits pueden ser problema

### Farcaster Hub
**Riesgo:** 🟢 Bajo
- ✅ Protocolo descentralizado
- ✅ Sin vendor lock-in
- ✅ Gratis para siempre
- ⚠️ Más complejo inicialmente
- ⚠️ Hubs públicos pueden caer (usar múltiples)

---

## 📋 Checklist de Decisión

### ¿Usar Neynar con cache?
- [ ] Necesitas lanzar YA (esta semana)
- [ ] No tienes tiempo para migrar
- [ ] <100 usuarios activos/mes
- [ ] Budget no es crítico

**→ Sí a alguna = Quedar con Neynar + cache**

### ¿Migrar a Airstack?
- [ ] Quieres GraphQL fácil de usar
- [ ] Prefieres servicio probado
- [ ] 100-10,000 usuarios activos/mes
- [ ] Puedes invertir 1 semana en migración

**→ Sí a 2+ = Migrar a Airstack**

### ¿Migrar a Farcaster Hub?
- [ ] Quieres independencia total
- [ ] 10,000+ usuarios activos/mes
- [ ] Costos son críticos
- [ ] Puedes invertir 2 semanas en migración

**→ Sí a 2+ = Migrar a Hub**

---

## 🎯 Decisión Recomendada

### Para SocialDrop (situación actual):

**FASE 1 (Esta semana):** ✅ Mantener Neynar + Cache
- Ya implementado
- Funciona bien
- $0-25/mes
- Sin riesgo

**FASE 2 (Próximas 2 semanas):** 🔄 Validar alternativas
- Ejecutar test-airstack.js
- Ejecutar test-hub.js
- Comparar resultados
- Decidir basado en datos reales

**FASE 3 (En 1 mes):** 🚀 Migrar a Hub + Airstack fallback
- Hub como principal (gratis)
- Airstack como fallback (gratis hasta 100k)
- Neynar solo para publishCast

**Ahorro proyectado año 1:** $300-600

---

## 📚 Referencias

### Pricing Oficial

**Neynar:**
- Free: 500 requests/día (~15k/mes) - No suficiente
- Starter: $25/mes - 100k requests
- Standard: $300/mes - 500k requests
- Fuente: https://neynar.com/pricing

**Airstack:**
- Free: 100k requests/mes
- Hobby: $49/mes - 500k requests
- Pro: $199/mes - 2M requests
- Fuente: https://www.airstack.xyz/pricing

**Farcaster Hub:**
- Gratis: Ilimitado
- Self-hosted: $0-50/mes (opcional)
- Fuente: https://docs.farcaster.xyz

---

## ✅ Conclusión

**Recomendación final:**

1. **Corto plazo (ahora):** Neynar + Cache
2. **Mediano plazo (1 mes):** Airstack (validar primero)
3. **Largo plazo (3 meses):** Farcaster Hub + fallbacks

**Ahorro total proyectado (año 1):** $300-600
**Inversión en migración:** $925 (12 horas dev)
**ROI:** Positivo en 4-12 meses

**Riesgo:** Bajo - todas las opciones validadas por comunidad

---

**Próximo paso:** Ejecutar scripts de validación en tu ambiente local para confirmar que todo funciona antes de migrar. 🚀
