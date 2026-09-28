const OpenAI = require('openai')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Modello usato per la conversazione. Un modello "mini" basta per questo
// compito e costa molto meno di quelli grandi
const CHAT_MODEL = 'gpt-5.4-mini'

// Trasforma un testo in un embedding, cioè un array di numeri che ne
// rappresenta il significato. Testi con significato simile danno vettori vicini:
// è quello che permette alla RAG di cercare "per senso" e non per parole esatte
async function createEmbedding(text) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text
  })

  return response.data[0].embedding
}

module.exports = { openai, CHAT_MODEL, createEmbedding }
