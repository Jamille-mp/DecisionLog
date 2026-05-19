type CircuitState = "closed" | "open" | "half-open";

type DomainEvent = {
  type: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
};

const failureThreshold = 3;
const recoveryTimeoutMs = 30_000;

let circuitState: CircuitState = "closed";
let failureCount = 0;
let lastFailureAt: Date | null = null;
const publishedEvents: DomainEvent[] = [];

function shouldTryHalfOpen() {
  if (circuitState !== "open" || !lastFailureAt) {
    return false;
  }

  return Date.now() - lastFailureAt.getTime() >= recoveryTimeoutMs;
}

function registerFailure() {
  failureCount += 1;
  lastFailureAt = new Date();

  if (failureCount >= failureThreshold) {
    circuitState = "open";
  }
}

function registerSuccess() {
  failureCount = 0;
  lastFailureAt = null;
  circuitState = "closed";
}

export async function publishDomainEvent(
  type: string,
  payload: Record<string, unknown>,
) {
  if (shouldTryHalfOpen()) {
    circuitState = "half-open";
  }

  if (circuitState === "open") {
    return {
      delivered: false,
      reason: "Circuit breaker aberto para eventos.",
    };
  }

  try {
    if (process.env.EVENT_BROKER_MODE === "fail") {
      throw new Error("Broker de eventos indisponível.");
    }

    publishedEvents.push({
      type,
      payload,
      occurredAt: new Date(),
    });
    registerSuccess();

    return {
      delivered: true,
    };
  } catch {
    registerFailure();

    return {
      delivered: false,
      reason: "Falha ao publicar evento.",
    };
  }
}

export function getEventBusHealth() {
  return {
    state: circuitState,
    failureCount,
    lastFailureAt,
    publishedEvents: publishedEvents.length,
  };
}

export function resetEventBusForTests() {
  circuitState = "closed";
  failureCount = 0;
  lastFailureAt = null;
  publishedEvents.length = 0;
}
