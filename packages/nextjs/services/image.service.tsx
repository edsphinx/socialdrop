// lib/services/image.service.ts
import { ImageResponse } from "@vercel/og";

// Esta función genera la imagen inicial y de progreso
export async function getProgressImage(mintCount: number, maxMints: number, campaignName: string) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#1d1d1d",
          color: "white",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <h1 style={{ fontSize: "48px", marginBottom: "20px" }}> {campaignName} </h1>
        <p style={{ fontSize: "72px", fontWeight: "bold" }}>
          {" "}
          {mintCount} / {maxMints}{" "}
        </p>
        <p style={{ fontSize: "32px" }}> NFTs Entregados </p>
      </div>
    ),
    { width: 800, height: 418 }, // Tamaño estándar para Frames
  );
}

// Esta función genera la imagen que muestra las instrucciones
export async function getInstructionsImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: "#1d1d1d",
          color: "white",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <h1 style={{ fontSize: "48px" }}> Cómo Participar </h1>
        <p style={{ fontSize: "32px", marginTop: "20px" }}> Simplemente dale &rsquo;like&rsquo; al cast original </p>
        <p style={{ fontSize: "32px" }}> para recibir el Airdrop Mágico.</p>
      </div>
    ),
    { width: 800, height: 418 },
  );
}

// TODO: Crear una función para la imagen de los últimos ganadores
