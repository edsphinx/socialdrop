# SocialDrop 💧

### Airdrops Virales y NFTs Evolutivos en Farcaster

**SocialDrop** es una Mini-App construida sobre Base que transforma los airdrops de NFTs de eventos pasivos a experiencias sociales interactivas y gamificadas.

---

**Enlaces Clave:**
* **Demo en Vivo:** [https://socialdrop.live](https://socialdrop.live)
* **Video de la Demo (4 min):** `[ENLACE A TU VIDEO AQUÍ]`

---

## El Problema
Los airdrops tradicionales en Web3 son ineficientes. Se anuncian en Twitter o Discord, los usuarios conectan sus wallets en un sitio externo, y la interacción termina ahí. No generan engagement sostenido ni aprovechan el poder de las redes sociales on-chain.

## Nuestra Solución: SocialDrop
SocialDrop integra el proceso de airdrop directamente en el feed de Farcaster, convirtiendo una simple acción social —dar 'like' a un cast— en el punto de entrada a un ecosistema de recompensas.

Esto no solo distribuye NFTs, sino que incentiva a los usuarios a convertirse en embajadores de la marca, creando un ciclo de viralidad y engagement a largo plazo.

## Features Clave

* **🚀 Creación de Campañas Simplificada:** Un panel de control intuitivo donde los creadores pueden lanzar una campaña en segundos, usando simplemente la URL de un cast.
* **📱 Mini-App Nativa en Farcaster:** Una experiencia de usuario fluida dentro de Farcaster para ver el progreso de la campaña y reclamar NFTs.
* **✨ Airdrop "On-Demand":** Los usuarios elegibles (que han dado 'like') pueden reclamar su NFT directamente desde la Mini-App, creando un momento de gratificación instantánea.
* **💎 NFTs Evolutivos:** El Smart Contract (ERC-721) está diseñado para que los NFTs puedan "subir de nivel", cambiando sus metadatos on-chain.
* **🏆 Gamificación (La Guerra de Influencia):** Un sistema donde los dueños de NFTs compiten por tener el cast más influyente (medido en 'likes'), lo que les permite evolucionar su NFT.

## Tech Stack

* **Blockchain:** Base Sepolia, Solidity, Hardhat, Viem
* **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS, DaisyUI
* **Backend:** Next.js API Routes, Prisma, Supabase (PostgreSQL)
* **Farcaster:** `@farcaster/miniapp-sdk`, Neynar API, OnchainKit
* **Despliegue:** Vercel

## Cómo Probarlo

1.  **Flujo del Creador:**
    * Visita [https://socialdrop.live/admin](https://socialdrop.live/admin).
    * Crea una nueva campaña pegando la URL de cualquier cast de Farcaster.

2.  **Flujo del Participante:**
    * Con una cuenta de Farcaster, dale 'like' al cast que configuraste.
    * Abre el enlace de la Mini-App (ej. `https://socialdrop.live/c/1`).
    * Haz clic en "Reclamar mi NFT". La transacción se ejecutará y recibirás el NFT en tu wallet.

## Visión a Futuro

* **Monetización:** Implementar un sistema de fees para los creadores de campañas basado en el número de NFTs a distribuir.
* **Leaderboard en Tiempo Real:** Mostrar el ranking de la "Guerra de Influencia" directamente en la Mini-App.
* **Integración Multi-Can
