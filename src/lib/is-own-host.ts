const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "jalawarta.com";

export function isOwnHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === ROOT ||
    hostname === "app.localhost" ||
    hostname === `app.${ROOT}` ||
    hostname === "platform.localhost" ||
    hostname === `platform.${ROOT}`
  );
}
