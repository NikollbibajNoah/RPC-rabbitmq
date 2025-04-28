import amqp, { Channel, ChannelModel, ConsumeMessage } from "amqplib";

const startServer = async () => {
  const connection: ChannelModel = await amqp.connect("amqp://localhost");
  const channel: Channel = await connection.createChannel();
  const queue: string = "text_analyzer_rpc";

  await channel.assertQueue(queue, { durable: false });
  channel.prefetch(1);

  console.log(" [x] Awaiting Text Analyzer RPC requests");

  channel.consume(queue, async (msg: ConsumeMessage | null) => {
    if (!msg) return;

    const text: string = msg.content.toString();

    console.log(" [.] Received:", text);

    const result: AnalysedText = analyzeText(text);

    channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(result)),
      {
        correlationId: msg.properties.correlationId,
      }
    );

    channel.ack(msg);
  });
};

interface AnalysedText {
  words: number;
  letters: number;
  avgWordLength: number;
}

const analyzeText = (text: string): AnalysedText => {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const letters = text.replace(/[^a-zA-Z]/g, "").length;
  const avgWordLength = words.length ? letters / words.length : 0;

  return {
    words: words.length,
    letters: letters,
    avgWordLength: parseFloat(avgWordLength.toFixed(2)),
  };
};

startServer().catch(console.error);
