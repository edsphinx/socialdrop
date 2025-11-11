# 🚀 Migración de SocialDrop a Base Mini App

## 📋 ¿Qué es un Base Mini App?

**Base Mini Apps** son aplicaciones web que corren **dentro de Base App**, proporcionando:

- ✅ **Identidad integrada**: Los usuarios ya están autenticados
- ✅ **Smart Wallet built-in**: Acceso a wallet sin conexión externa
- ✅ **Compartir nativo**: Viralidad dentro de Farcaster
- ✅ **Gasless transactions**: Mejor UX para nuevos usuarios
- ✅ **Descubrimiento social**: Apareces en feeds de Base App

**Ventajas para SocialDrop:**
- 🎯 **Menos fricción**: No pedir conexión de wallet inicial
- 🎯 **Más viralidad**: Compartir NFTs nativamente en Farcaster
- 🎯 **Mejor onboarding**: SIWF (Sign In With Farcaster) es más simple
- 🎯 **Gasless**: Subsidiar gas para claims mejora conversión
- 🎯 **Distribución**: Aparecer en Base App = más usuarios

---

## 🎯 Estado Actual vs. Mini App

### SocialDrop Actual
```
Usuario → Visita website
       → Conecta wallet manualmente (RainbowKit)
       → Firma mensaje
       → Usa la app
       → Comparte en Farcaster (externa)
```

### SocialDrop como Mini App
```
Usuario → Abre desde Base App
       → Ya tiene identidad + wallet
       → SIWF con 1 click
       → Usa la app (más fluido)
       → Comparte NFT (botón nativo)
       → Amigos ven y abren (dentro de Base App)
```

**Resultado:** 60-80% menos fricción en onboarding

---

## 📦 Dependencias Requeridas

### 1. Instalar MiniKit y OnchainKit

```bash
cd packages/nextjs
npm install @coinbase/minikit @coinbase/onchainkit
```

**Versiones recomendadas:**
- `@coinbase/minikit`: ^0.1.0+
- `@coinbase/onchainkit`: ^0.30.0+

### 2. Obtener API Keys

**OnchainKit API Key:**
1. Ve a https://portal.cdp.coinbase.com
2. Crea un proyecto
3. Copia tu API key
4. Agrega a `.env.local`:
   ```bash
   NEXT_PUBLIC_ONCHAINKIT_API_KEY=tu_api_key_aqui
   ```

---

## 🔧 Implementación Paso a Paso

### Paso 1: Configurar OnchainKit Provider

**Archivo:** `packages/nextjs/app/providers.tsx`

```typescript
"use client";

import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "wagmi/chains";
import { ReactNode } from "react";

export function OnchainProviders({ children }: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{
        appearance: {
          mode: "auto", // 'light' | 'dark' | 'auto'
          theme: "default",
        },
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
```

**Actualizar:** `packages/nextjs/app/layout.tsx`

```typescript
import { OnchainProviders } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OnchainProviders>
          {children}
        </OnchainProviders>
      </body>
    </html>
  );
}
```

---

### Paso 2: Inicializar MiniKit

**Archivo:** `packages/nextjs/components/MiniKitInitializer.tsx`

```typescript
"use client";

import { useEffect } from "react";
import { sdk } from "@coinbase/minikit";

export function MiniKitInitializer() {
  useEffect(() => {
    // Notificar a Base App que la app está lista
    sdk.actions.ready();

    console.log("[MiniKit] App initialized and ready");
  }, []);

  return null; // No renderiza nada, solo inicializa
}
```

**Agregar a layout:**

```typescript
import { MiniKitInitializer } from "@/components/MiniKitInitializer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <OnchainProviders>
          <MiniKitInitializer />
          {children}
        </OnchainProviders>
      </body>
    </html>
  );
}
```

---

### Paso 3: Implementar Autenticación con SIWF

**Archivo:** `packages/nextjs/hooks/useMiniAppAuth.ts`

```typescript
"use client";

import { useEffect, useState } from "react";
import { useMiniKit, useAuthenticate } from "@coinbase/minikit";

interface MiniAppUser {
  fid: number;
  username: string;
  address: string;
  pfpUrl?: string;
  isAuthenticated: boolean;
}

export function useMiniAppAuth() {
  const { context, isReady } = useMiniKit();
  const { user: authenticatedUser } = useAuthenticate();
  const [user, setUser] = useState<MiniAppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady) return;

    // Si ya está autenticado (via SIWF o wallet)
    if (authenticatedUser) {
      setUser({
        fid: authenticatedUser.fid,
        username: authenticatedUser.username,
        address: authenticatedUser.address,
        pfpUrl: authenticatedUser.pfpUrl,
        isAuthenticated: true,
      });
      setLoading(false);
      return;
    }

    // Si tiene contexto de Base App (pero no autenticado)
    if (context?.user) {
      // IMPORTANTE: context.user NO es prueba criptográfica
      // Solo usar para prefill, NO para autenticación
      setUser({
        fid: context.user.fid,
        username: context.user.username || "",
        address: context.user.address || "",
        pfpUrl: context.user.pfpUrl,
        isAuthenticated: false, // No verificado
      });
    }

    setLoading(false);
  }, [isReady, context, authenticatedUser]);

  const signIn = async () => {
    try {
      // SIWF (Sign In With Farcaster) - Quick Auth
      const result = await sdk.actions.signInWithFarcaster();

      if (result.success) {
        console.log("[Auth] SIWF successful:", result.user);
        return result.user;
      } else {
        console.error("[Auth] SIWF failed:", result.error);
        return null;
      }
    } catch (error) {
      console.error("[Auth] SIWF error:", error);
      return null;
    }
  };

  const signOut = () => {
    setUser(null);
  };

  return {
    user,
    loading,
    isAuthenticated: user?.isAuthenticated || false,
    signIn,
    signOut,
    isMiniApp: isReady,
  };
}
```

---

### Paso 4: Crear Componente de Login

**Archivo:** `packages/nextjs/components/MiniAppLogin.tsx`

```typescript
"use client";

import { useMiniAppAuth } from "@/hooks/useMiniAppAuth";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";

export function MiniAppLogin() {
  const { user, loading, isAuthenticated, signIn, signOut, isMiniApp } = useMiniAppAuth();

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-gray-200" />
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
      </div>
    );
  }

  // Si NO está en Mini App, mostrar mensaje
  if (!isMiniApp) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm text-amber-800">
          ⚠️ Esta app funciona mejor en <strong>Base App</strong>
        </p>
        <a
          href="https://base.app"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:underline"
        >
          Abrir en Base App →
        </a>
      </div>
    );
  }

  // Usuario no autenticado
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col gap-3">
        {user && (
          <div className="flex items-center gap-2">
            {user.pfpUrl && (
              <Avatar src={user.pfpUrl} alt={user.username} className="h-8 w-8" />
            )}
            <span className="text-sm text-gray-600">
              Hi {user.username || "anon"}! 👋
            </span>
          </div>
        )}

        <Button onClick={signIn} className="w-full">
          Sign In with Farcaster
        </Button>

        <p className="text-xs text-gray-500 text-center">
          Continue as guest or sign in to claim NFTs
        </p>
      </div>
    );
  }

  // Usuario autenticado
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        {user.pfpUrl && (
          <Avatar src={user.pfpUrl} alt={user.username} className="h-8 w-8" />
        )}
        <div>
          <p className="text-sm font-medium">@{user.username}</p>
          <p className="text-xs text-gray-500">
            {user.address.slice(0, 6)}...{user.address.slice(-4)}
          </p>
        </div>
      </div>

      <Button onClick={signOut} variant="outline" size="sm">
        Sign Out
      </Button>
    </div>
  );
}
```

---

### Paso 5: Crear Manifest File

**Archivo:** `packages/nextjs/app/.well-known/farcaster.json/route.ts`

```typescript
import { NextResponse } from "next/server";

export async function GET() {
  const manifest = {
    accountAssociation: {
      // ESTOS SE GENERAN EN PASO 8 con Base Build
      header: "", // Se llena después
      payload: "", // Se llena después
      signature: "", // Se llena después
    },

    baseBuilder: {
      ownerAddress: process.env.NEXT_PUBLIC_BUILDER_ADDRESS || "",
    },

    miniapp: {
      version: "next",
      name: "SocialDrop",
      homeUrl: process.env.NEXT_PUBLIC_APP_URL || "https://socialdrop.xyz",
      iconUrl: `${process.env.NEXT_PUBLIC_APP_URL}/icon.png`,

      splashImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/splash.png`,
      splashBackgroundColor: "#6366f1", // Indigo

      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/miniapp/webhook`,

      subtitle: "Get NFTs for engaging with Farcaster casts",
      description: "SocialDrop rewards you with evolving NFTs for liking and sharing casts. The more engagement, the rarer your NFT becomes!",

      screenshotUrls: [
        `${process.env.NEXT_PUBLIC_APP_URL}/screenshots/home.png`,
        `${process.env.NEXT_PUBLIC_APP_URL}/screenshots/claim.png`,
        `${process.env.NEXT_PUBLIC_APP_URL}/screenshots/nft.png`,
      ],

      primaryCategory: "social",
      tags: ["nft", "farcaster", "rewards", "gamification"],

      heroImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/hero.png`,
      tagline: "Your engagement, your evolving NFT",

      ogTitle: "SocialDrop - Farcaster NFT Rewards",
      ogDescription: "Get rewarded with evolving NFTs for your Farcaster engagement",
      ogImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/og-image.png`,

      noindex: false, // true para development
    },
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600", // Cache 1 hora
    },
  });
}
```

**Agregar a `.env.local`:**

```bash
# Base Mini App
NEXT_PUBLIC_APP_URL=https://socialdrop.xyz
NEXT_PUBLIC_BUILDER_ADDRESS=0xTU_ADDRESS_AQUI
```

---

### Paso 6: Agregar Embed Metadata

**Actualizar:** `packages/nextjs/app/layout.tsx`

```typescript
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "SocialDrop - Farcaster NFT Rewards",
  description: "Get rewarded with evolving NFTs for your Farcaster engagement",

  // Open Graph
  openGraph: {
    title: "SocialDrop",
    description: "Your engagement, your evolving NFT",
    images: ["/og-image.png"],
    type: "website",
  },

  // Farcaster Mini App metadata
  other: {
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/embed.png`,
      button: {
        title: "Open SocialDrop",
        action: {
          type: "launch",
        },
      },
      splashImageUrl: `${process.env.NEXT_PUBLIC_APP_URL}/splash.png`,
      splashBackgroundColor: "#6366f1",
    }),
  },
};
```

---

### Paso 7: Implementar Share de NFTs

**Archivo:** `packages/nextjs/components/ShareNFT.tsx`

```typescript
"use client";

import { sdk } from "@coinbase/minikit";
import { Button } from "@/components/ui/button";

interface ShareNFTProps {
  nftLevel: number;
  campaignName: string;
  imageUrl: string;
}

export function ShareNFT({ nftLevel, campaignName, imageUrl }: ShareNFTProps) {
  const handleShare = async () => {
    try {
      const result = await sdk.actions.share({
        text: `Just got a Level ${nftLevel} NFT from ${campaignName} on SocialDrop! 🎉`,
        embeds: [
          {
            url: imageUrl,
          },
        ],
      });

      if (result.success) {
        console.log("[Share] NFT shared successfully");

        // Opcional: Reward por compartir
        // await trackShare(result.castHash);
      } else {
        console.error("[Share] Failed:", result.error);
      }
    } catch (error) {
      console.error("[Share] Error:", error);
    }
  };

  return (
    <Button onClick={handleShare} className="w-full">
      Share Your NFT 🚀
    </Button>
  );
}
```

---

### Paso 8: Generar Account Association

**Una vez que todo esté deployado:**

1. Asegúrate de que `.well-known/farcaster.json` sea accesible públicamente:
   ```
   https://socialdrop.xyz/.well-known/farcaster.json
   ```

2. Ve a **Base Build** (herramienta de verificación):
   ```
   https://build.base.org/verify
   ```

3. Ingresa tu dominio: `socialdrop.xyz`

4. Click **"Verify"** y sigue los pasos para firmar

5. Copia los 3 campos generados:
   - `header`
   - `payload`
   - `signature`

6. Actualiza `accountAssociation` en el manifest

---

### Paso 9: Crear Assets de Mini App

**Imágenes requeridas:**

```
/public/
  ├── icon.png          # 512x512px - App icon
  ├── splash.png        # 1200x630px - Splash screen
  ├── hero.png          # 1200x630px - Hero image
  ├── og-image.png      # 1200x630px - Open Graph
  ├── embed.png         # 1200x630px - Embed preview
  └── screenshots/
      ├── home.png      # 1080x1920px - Screenshot 1
      ├── claim.png     # 1080x1920px - Screenshot 2
      └── nft.png       # 1080x1920px - Screenshot 3
```

**Specs:**
- **Icon**: PNG, 512x512px, transparent background
- **Splash**: PNG/JPG, 1200x630px, branding
- **Screenshots**: PNG/JPG, mobile aspect ratio (9:16)

---

## 🔄 Flujo de Usuario Actualizado

### Antes (Actual)
```
1. Usuario ve link de SocialDrop
2. Click → Abre website en browser
3. "Connect Wallet" button
4. Selecciona wallet (MetaMask/Coinbase/etc)
5. Aprueba conexión
6. Firma mensaje
7. Ve campaña
8. Click "Claim NFT"
9. Aprueba transacción en wallet
10. Recibe NFT
```

**Pasos de fricción: 10**

### Después (Mini App)
```
1. Usuario ve cast de SocialDrop en Base App
2. Click → Abre Mini App (dentro de Base App)
3. Ve campaña (identidad + wallet ya disponibles)
4. Click "Claim NFT"
5. SIWF con 1 click si es necesario
6. Aprueba transacción (gasless opcional)
7. Recibe NFT
8. Comparte con botón nativo
```

**Pasos de fricción: 4-5** (60% reducción)

---

## 📊 Mejoras para SocialDrop

### 1. Guest Mode (Progressive Onboarding)

Permitir explorar sin autenticar:

```typescript
// packages/nextjs/app/page.tsx
export default function HomePage() {
  const { isAuthenticated } = useMiniAppAuth();

  return (
    <div>
      {/* Siempre visible */}
      <CampaignList />

      {/* Solo si autenticado */}
      {isAuthenticated && <ClaimButton />}

      {/* Si NO autenticado, invitar a login */}
      {!isAuthenticated && (
        <div className="text-center">
          <p>Sign in to claim your NFT!</p>
          <MiniAppLogin />
        </div>
      )}
    </div>
  );
}
```

### 2. Gasless Transactions (Coinbase Paymaster)

Subsidiar gas para nuevos usuarios:

```typescript
import { PaymasterMode } from "@coinbase/onchainkit";

const paymasterOptions = {
  mode: PaymasterMode.Sponsored,
  capabilities: ["paymasterService"],
};

// Usar en claim transaction
await contract.mint(userAddress, {
  ...paymasterOptions,
});
```

### 3. Notificaciones de Evolución

Notificar cuando NFT evoluciona:

```typescript
// packages/nextjs/services/evolution.service.ts
async function notifyEvolution(fid: number, nftLevel: number) {
  await sdk.actions.sendNotification({
    targetFid: fid,
    title: "Your NFT evolved! 🎉",
    body: `Your NFT is now Level ${nftLevel}`,
    actionUrl: `${process.env.NEXT_PUBLIC_APP_URL}/my-nfts`,
  });
}
```

### 4. Prefill con Context

Usar datos de Base App para prefill:

```typescript
const { context } = useMiniKit();

// Prefill form con datos conocidos
<input
  defaultValue={context?.user?.username || ""}
  placeholder="Username"
/>
```

---

## 🧪 Testing

### 1. Local Development

```bash
npm run dev

# Probar en: http://localhost:3000
```

**Simular Mini App context:**
```typescript
// Solo para testing
if (process.env.NODE_ENV === "development") {
  (window as any).miniKit = {
    isReady: true,
    context: {
      user: {
        fid: 3,
        username: "testuser",
        address: "0x...",
      },
    },
  };
}
```

### 2. Preview Tool

**Probar antes de publicar:**

1. Deploy a staging/production
2. Ve a: https://build.base.org/preview
3. Ingresa tu URL
4. Valida:
   - ✅ Manifest carga correctamente
   - ✅ Embed se ve bien
   - ✅ Launch button funciona
   - ✅ No hay errores en consola

### 3. Base App Testing

**Publicar en Base App:**

1. Abre Base App
2. Crea un cast con tu URL:
   ```
   Check out my new Mini App! 🚀
   https://socialdrop.xyz
   ```
3. El embed debe aparecer automáticamente
4. Click "Open" para probar

---

## 📋 Checklist de Migración

### Setup Inicial
- [ ] Instalar `@coinbase/minikit` y `@coinbase/onchainkit`
- [ ] Obtener OnchainKit API key
- [ ] Configurar `OnchainKitProvider`
- [ ] Implementar `MiniKitInitializer`

### Autenticación
- [ ] Crear hook `useMiniAppAuth`
- [ ] Implementar componente `MiniAppLogin`
- [ ] Migrar flows existentes a SIWF
- [ ] Agregar guest mode para exploración

### Manifest y Metadata
- [ ] Crear route `.well-known/farcaster.json`
- [ ] Generar account association credentials
- [ ] Agregar embed metadata en layout
- [ ] Configurar variables de entorno

### Assets
- [ ] Crear icon.png (512x512)
- [ ] Crear splash.png (1200x630)
- [ ] Crear hero.png (1200x630)
- [ ] Crear og-image.png (1200x630)
- [ ] Crear 3 screenshots (9:16 ratio)

### Features de Mini App
- [ ] Implementar `ShareNFT` component
- [ ] Agregar notificaciones de evolución
- [ ] Implementar gasless transactions (opcional)
- [ ] Prefill forms con context data

### Testing
- [ ] Probar localmente con mock data
- [ ] Validar manifest en Preview Tool
- [ ] Probar en Base App (staging)
- [ ] Fix issues encontrados
- [ ] Deploy a producción

### Publicación
- [ ] Verificar account association
- [ ] Publicar cast en Base App
- [ ] Monitorear analytics
- [ ] Iterar basado en feedback

---

## 🚨 Consideraciones Importantes

### 1. Backwards Compatibility

**Mantener compatibilidad con web normal:**

```typescript
export function useMiniAppAuth() {
  const { isReady } = useMiniKit();

  // Fallback a RainbowKit si NO está en Mini App
  if (!isReady && typeof window !== "undefined") {
    return useRainbowKitAuth(); // Tu auth actual
  }

  // Usar SIWF si está en Mini App
  return useSIWFAuth();
}
```

### 2. Feature Detection

**Detectar capabilities antes de usar:**

```typescript
const { context } = useMiniKit();

// Verificar si soporta share
if (context?.capabilities?.includes("share")) {
  // Mostrar botón de share
} else {
  // Mostrar share alternativo
}
```

### 3. Error Handling

**Manejar errores de Mini App:**

```typescript
try {
  const result = await sdk.actions.signInWithFarcaster();

  if (!result.success) {
    // Usuario canceló o error
    console.log("Auth cancelled or failed");
  }
} catch (error) {
  // Error técnico
  console.error("SIWF error:", error);

  // Fallback a método tradicional
  await connectWallet();
}
```

---

## 📈 Métricas de Éxito

### KPIs a Monitorear

**Onboarding:**
- Time to first claim (antes vs después)
- Auth completion rate
- Guest → Authenticated conversion

**Engagement:**
- Share rate (NFTs compartidos)
- Viral coefficient (nuevos users por share)
- DAU/MAU ratio

**Técnico:**
- App load time (< 2s)
- Time to interactive (< 3s)
- Error rate en SIWF (< 5%)

---

## 🔗 Recursos

### Documentación Oficial
- Base Mini Apps: https://docs.base.org/mini-apps
- OnchainKit Docs: https://onchainkit.xyz
- MiniKit SDK: https://docs.cdp.coinbase.com/minikit

### Tools
- Base Build (Verify): https://build.base.org/verify
- Preview Tool: https://build.base.org/preview
- CDP Portal: https://portal.cdp.coinbase.com

### Community
- Base Discord: https://discord.gg/base
- Farcaster Dev Chat: /fc-devs en Warpcast

---

## 🎯 Próximos Pasos

1. **Esta semana:**
   - Instalar dependencias
   - Configurar providers
   - Implementar SIWF auth

2. **Próxima semana:**
   - Crear manifest
   - Generar assets
   - Deploy a staging

3. **En 2 semanas:**
   - Testing completo
   - Generar account association
   - Publicar en Base App

**Tiempo estimado total:** 2-3 semanas
**Esfuerzo:** ~30-40 horas dev

---

**¡Con esto, SocialDrop será un Mini App nativo de Base! 🚀**
