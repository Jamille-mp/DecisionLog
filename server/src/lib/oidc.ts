import crypto from "node:crypto";
import { AppError } from "../errors/AppError";
import { getOidcStateSecret } from "./secrets";

type OidcDiscovery = {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  jwks_uri: string;
};

type JwkSet = {
  keys: Array<JsonWebKey & { kid?: string }>;
};

type TokenResponse = {
  id_token?: string;
  access_token?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

export type OidcProfile = {
  sub: string;
  email: string;
  name: string;
};

let discoveryCache: OidcDiscovery | null = null;
let jwksCache: JwkSet | null = null;

function getRequiredEnv(name: string) {
  const value = process.env[name];

  if (!value) {
    throw new AppError(`Configuração OpenID ausente: ${name}.`, 503);
  }

  return value;
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeBase64Url(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(
    normalized.length + ((4 - (normalized.length % 4)) % 4),
    "=",
  );

  return Buffer.from(padded, "base64");
}

function jsonFromBase64Url<T>(input: string) {
  return JSON.parse(decodeBase64Url(input).toString("utf8")) as T;
}

function getOidcSecret() {
  return getOidcStateSecret();
}

export function isOidcEnabled() {
  return Boolean(
    process.env.OIDC_ISSUER_URL &&
      process.env.OIDC_CLIENT_ID &&
      process.env.OIDC_CLIENT_SECRET &&
      process.env.OIDC_REDIRECT_URI,
  );
}

export function getOidcPublicConfig() {
  return {
    enabled: isOidcEnabled(),
    providerName: process.env.OIDC_PROVIDER_NAME || "Login institucional",
  };
}

async function getJson<T>(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new AppError("Falha ao consultar provedor OpenID.", 503);
  }

  return (await response.json()) as T;
}

export async function getDiscovery() {
  if (discoveryCache) return discoveryCache;

  const issuer = getRequiredEnv("OIDC_ISSUER_URL").replace(/\/$/, "");
  discoveryCache = await getJson<OidcDiscovery>(
    `${issuer}/.well-known/openid-configuration`,
  );

  return discoveryCache;
}

async function getJwks(jwksUri: string) {
  if (jwksCache) return jwksCache;

  jwksCache = await getJson<JwkSet>(jwksUri);
  return jwksCache;
}

export function createOidcState(returnTo = "/", companyAccessCode?: string) {
  const payload = {
    companyAccessCode,
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    nonce: crypto.randomBytes(16).toString("hex"),
    returnTo,
  };
  const encodedPayload = base64Url(JSON.stringify(payload));
  const signature = base64Url(
    crypto.createHmac("sha256", getOidcSecret()).update(encodedPayload).digest(),
  );

  return {
    nonce: payload.nonce,
    state: `${encodedPayload}.${signature}`,
  };
}

export function verifyOidcState(state: string) {
  const [encodedPayload, signature] = state.split(".");

  if (!encodedPayload || !signature) {
    throw new AppError("Estado OpenID inválido.", 400);
  }

  const expectedSignature = base64Url(
    crypto.createHmac("sha256", getOidcSecret()).update(encodedPayload).digest(),
  );

  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    )
  ) {
    throw new AppError("Estado OpenID inválido.", 400);
  }

  const payload = jsonFromBase64Url<{
    companyAccessCode?: string;
    exp: number;
    nonce: string;
    returnTo?: string;
  }>(encodedPayload);

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new AppError("Estado OpenID expirado.", 400);
  }

  return payload;
}

export async function buildAuthorizationUrl(returnTo?: string, companyAccessCode?: string) {
  const discovery = await getDiscovery();
  const { nonce, state } = createOidcState(returnTo, companyAccessCode);
  const authorizationUrl = new URL(discovery.authorization_endpoint);

  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("client_id", getRequiredEnv("OIDC_CLIENT_ID"));
  authorizationUrl.searchParams.set("redirect_uri", getRequiredEnv("OIDC_REDIRECT_URI"));
  authorizationUrl.searchParams.set("scope", "openid email profile");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("nonce", nonce);

  return authorizationUrl.toString();
}

export async function exchangeAuthorizationCode(code: string) {
  const discovery = await getDiscovery();
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRequiredEnv("OIDC_REDIRECT_URI"),
    client_id: getRequiredEnv("OIDC_CLIENT_ID"),
    client_secret: getRequiredEnv("OIDC_CLIENT_SECRET"),
  });

  const response = await fetch(discovery.token_endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const tokenResponse = (await response.json()) as TokenResponse;

  if (!response.ok || tokenResponse.error || !tokenResponse.id_token) {
    throw new AppError(
      tokenResponse.error_description || "Falha ao autenticar com OpenID.",
      401,
    );
  }

  return tokenResponse.id_token;
}

export async function verifyIdToken(idToken: string, expectedNonce: string) {
  const [encodedHeader, encodedPayload, encodedSignature] = idToken.split(".");

  if (!encodedHeader || !encodedPayload || !encodedSignature) {
    throw new AppError("Token OpenID inválido.", 401);
  }

  const header = jsonFromBase64Url<{ alg: string; kid?: string }>(encodedHeader);
  const payload = jsonFromBase64Url<{
    aud: string | string[];
    email?: string;
    exp: number;
    iss: string;
    name?: string;
    nonce?: string;
    sub: string;
  }>(encodedPayload);

  if (header.alg !== "RS256" || !header.kid) {
    throw new AppError("Algoritmo OpenID não suportado.", 401);
  }

  const discovery = await getDiscovery();
  const jwks = await getJwks(discovery.jwks_uri);
  const jwk = jwks.keys.find((key) => key.kid === header.kid);

  if (!jwk) {
    throw new AppError("Chave pública OpenID não encontrada.", 401);
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${encodedHeader}.${encodedPayload}`);
  verifier.end();

  const isValidSignature = verifier.verify(
    crypto.createPublicKey({ key: jwk, format: "jwk" }),
    decodeBase64Url(encodedSignature),
  );

  const expectedIssuer = discovery.issuer || getRequiredEnv("OIDC_ISSUER_URL");
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];

  if (
    !isValidSignature ||
    payload.iss !== expectedIssuer ||
    !audience.includes(getRequiredEnv("OIDC_CLIENT_ID")) ||
    payload.exp < Math.floor(Date.now() / 1000) ||
    payload.nonce !== expectedNonce ||
    !payload.email
  ) {
    throw new AppError("Token OpenID inválido.", 401);
  }

  return {
    email: payload.email.toLowerCase(),
    name: payload.name || payload.email,
    sub: payload.sub,
  } satisfies OidcProfile;
}
