import { getInstructionsImage } from "~~/services/image.service";

export async function GET() {
  return getInstructionsImage();
}
