import amqp, { Channel, ChannelModel, ConsumeMessage, Replies } from "amqplib";
import { randomUUID, UUID } from "crypto";

const analyzeTextRPC = async (text: string): Promise<any> => {
  const connection: ChannelModel = await amqp.connect("amqp://localhost");
  const channel: Channel = await connection.createChannel();
  const queue: string = "text_analyzer_rpc";

  const replyQueue: Replies.AssertQueue = await channel.assertQueue("", {
    exclusive: true,
  });

  const correlationId: UUID = randomUUID();

  console.log(" [X] Sending Text:", text);

  const response: Promise<string> = new Promise<string>((resolve) => {
    channel.consume(
      replyQueue.queue,
      (msg: ConsumeMessage | null) => {
        if (msg && msg.properties.correlationId === correlationId) {
          resolve(msg.content.toString());
          setTimeout(() => {
            connection.close();
            process.exit(0);
          }, 500);
        }
      },
      { noAck: false }
    );
  });

  channel.sendToQueue(queue, Buffer.from(text), {
    correlationId: correlationId,
    replyTo: replyQueue.queue,
  });

  const result: string = await response;
  console.log(" [.] Response:", result);
};

const text: string = "Hello, this is a test message for the text analyzer RPC!";
analyzeTextRPC(text).catch(console.error);
