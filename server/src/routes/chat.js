const express = require('express')
const { openai, CHAT_MODEL } = require('../openai')
const { SYSTEM_PROMPT } = require('../prompt')

const router = express.Router()

// POST /api/chat
// Riceve la conversazione fino a qui: { messages: [{ role, content }, ...] }
// e risponde con il messaggio successivo del chatbot.
// Per ora è il client a mandare tutta la cronologia a ogni richiesta,
// perché il modello non ricorda nulla tra una chiamata e l'altra
router.post('/', async (req, res) => {
  const messages = req.body.messages

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Il campo messages deve essere un array non vuoto' })
  }

  for (let i = 0; i < messages.length; i++) {
    const message = messages[i]
    if (message.role !== 'user' && message.role !== 'assistant') {
      return res.status(400).json({ error: 'Ruolo non valido nel messaggio ' + i })
    }
    if (typeof message.content !== 'string' || message.content.trim() === '') {
      return res.status(400).json({ error: 'Contenuto mancante nel messaggio ' + i })
    }
  }

  // Il system prompt va sempre in testa: è lui che dà al modello
  // il ruolo e le regole. Lo aggiungo io lato server, così il client
  // non può modificarlo
  const fullConversation = [{ role: 'system', content: SYSTEM_PROMPT }]
  for (let i = 0; i < messages.length; i++) {
    fullConversation.push({ role: messages[i].role, content: messages[i].content })
  }

  const completion = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: fullConversation
  })

  const reply = completion.choices[0].message.content
  res.json({ reply: reply })
})

module.exports = router
