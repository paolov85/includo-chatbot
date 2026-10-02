const express = require('express')
const { db } = require('../db')

const router = express.Router()

// GET /api/conversations/:sessionId
// Restituisce i messaggi di una conversazione: serve al front end per
// ripristinare la chat quando l'utente ricarica la pagina
router.get('/:sessionId', async (req, res) => {
  const conversation = await db.collection('conversations').findOne({ _id: req.params.sessionId })

  if (!conversation) {
    return res.status(404).json({ error: 'Conversazione non trovata' })
  }

  // Al client mando solo ruolo e testo dei messaggi
  const messages = []
  for (let i = 0; i < conversation.messages.length; i++) {
    messages.push({
      role: conversation.messages[i].role,
      content: conversation.messages[i].content
    })
  }

  res.json({ sessionId: conversation._id, messages: messages })
})

module.exports = router
