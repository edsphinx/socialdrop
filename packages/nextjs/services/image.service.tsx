import { ImageResponse } from "@vercel/og";

// Generates the initial and progress image
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
        <p style={{ fontSize: "32px" }}> NFTs Claimed </p>
      </div>
    ),
    { width: 800, height: 418 },
  );
}

// Generates the instructions image
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
        <h1 style={{ fontSize: "48px" }}> How to Participate </h1>
        <p style={{ fontSize: "32px", marginTop: "20px" }}> Simply like the original cast </p>
        <p style={{ fontSize: "32px" }}> to receive the Airdrop.</p>
      </div>
    ),
    { width: 800, height: 418 },
  );
}
