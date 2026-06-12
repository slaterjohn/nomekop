import openGraphImage, {
  alt as openGraphAlt,
  contentType as openGraphContentType,
  size as openGraphSize,
} from "./opengraph-image";

/* Twitter card mirrors the site-default Open Graph image. The convention
 * fields are declared locally (rather than `export ... from`) so any
 * bundler's static export analysis finds them; the values themselves stay
 * single-sourced from app/opengraph-image.tsx. */

export const alt = openGraphAlt;
export const size = openGraphSize;
export const contentType = openGraphContentType;

export default openGraphImage;
