import amqp, { type Channel, type ChannelModel } from "amqplib";

type CircuitState = "closed" | "open" | "half-open";
type BrokerMode = "memory" | "rabbitmq" | "fail";

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
let rabbitConnection: ChannelModel | null = null;
let rabbitChannel: Channel | null = null;

function getBrokerMode(): BrokerMode {
  const mode = process.env.EVENT_BROKER_MODE || process.env.EVENTS_MODE;

  if (mode === "rabbitmq" || mode === "fail") {
    return mode;
  }

  if (process.env.NODE_ENV === "production") {
    return "rabbitmq";
  }

  return "memory";
}

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

async function getRabbitChannel() {
  if (rabbitChannel) {
    return rabbitChannel;
  }

  const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";
  const exchange = process.env.RABBITMQ_EXCHANGE || "decisionlog.events";
  const queue = process.env.RABBITMQ_QUEUE || "decisionlog.audit.events";

  rabbitConnection = await amqp.connect(url);
  rabbitChannel = await rabbitConnection.createChannel();
  await rabbitChannel.assertExchange(exchange, "topic", { durable: true });
  await rabbitChannel.assertQueue(queue, { durable: true });
  await rabbitChannel.bindQueue(queue, exchange, "#");

  return rabbitChannel;
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
    const event = {
      type,
      payload,
      occurredAt: new Date(),
    };
    const mode = getBrokerMode();

    if (mode === "fail") {
      throw new Error("Broker de eventos indisponivel.");
    }

    if (mode === "rabbitmq") {
      const channel = await getRabbitChannel();
      const exchange = process.env.RABBITMQ_EXCHANGE || "decisionlog.events";
      const routingKey = type.toLowerCase().replace(/_/g, ".");

      channel.publish(exchange, routingKey, Buffer.from(JSON.stringify(event)), {
        contentType: "application/json",
        persistent: true,
      });
    }

    publishedEvents.push(event);
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
  const mode = getBrokerMode();

  return {
    mode,
    configured: mode === "rabbitmq" ? Boolean(process.env.RABBITMQ_URL) : true,
    queue:
      mode === "rabbitmq"
        ? process.env.RABBITMQ_QUEUE || "decisionlog.audit.events"
        : null,
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
  rabbitChannel = null;
  rabbitConnection = null;
}
