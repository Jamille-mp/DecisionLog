import amqp from "amqplib";
import dotenv from "dotenv";

dotenv.config();

async function startConsumer() {
  const url = process.env.RABBITMQ_URL || "amqp://localhost:5672";
  const exchange = process.env.RABBITMQ_EXCHANGE || "decisionlog.events";
  const queue = process.env.RABBITMQ_QUEUE || "decisionlog.audit.events";

  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();

  await channel.assertExchange(exchange, "topic", { durable: true });
  await channel.assertQueue(queue, { durable: true });
  await channel.bindQueue(queue, exchange, "#");
  channel.prefetch(1);

  console.log(`[events] Consumidor conectado na fila "${queue}".`);
  console.log("[events] Aguardando mensagens do DecisionLog...");

  await channel.consume(queue, (message) => {
    if (!message) return;

    const content = message.content.toString("utf-8");
    const routingKey = message.fields.routingKey;

    try {
      const event = JSON.parse(content) as {
        type?: string;
        payload?: Record<string, unknown>;
        occurredAt?: string;
      };

      console.log("[events] Mensagem consumida com sucesso:");
      console.log(
        JSON.stringify(
          {
            routingKey,
            type: event.type,
            occurredAt: event.occurredAt,
            payload: event.payload,
          },
          null,
          2,
        ),
      );
      channel.ack(message);
    } catch {
      console.log("[events] Mensagem recebida em formato invalido:");
      console.log(content);
      channel.nack(message, false, false);
    }
  });
}

startConsumer().catch((error) => {
  console.error("[events] Falha ao iniciar consumidor RabbitMQ.");
  console.error(error);
  process.exit(1);
});
