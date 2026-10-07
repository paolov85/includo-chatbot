// Descrizione del tool searchCourses nel formato richiesto da OpenAI.
// Il modello non esegue la funzione: legge questa descrizione e, quando
// decide che è il momento, ci risponde "chiama searchCourses con questi
// parametri". A eseguirla davvero è il nostro server
const searchCoursesTool = {
  type: 'function',
  function: {
    name: 'searchCourses',
    description: 'Cerca nel catalogo IncluDO i corsi più adatti al profilo dell\'utente. ' +
      'Da chiamare una sola volta, solo dopo aver raccolto tutte le informazioni sull\'utente.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Descrizione in italiano di cosa cerca l\'utente: area di interesse, ' +
            'tempo disponibile a settimana, obiettivo e livello. ' +
            'Esempio: "lavorare il legno, 15 ore a settimana, trovare lavoro, principiante"'
        },
        remote: {
          type: 'boolean',
          description: 'true se l\'utente vuole un corso da remoto, false se lo vuole in presenza. ' +
            'Da omettere se per l\'utente va bene in entrambi i modi.'
        }
      },
      required: ['query']
    }
  }
}

// Controlla gli argomenti che il modello ha scritto per searchCourses.
// Il modello di solito rispetta la descrizione del tool, ma non è garantito:
// prima di eseguire qualcosa verifico i tipi, come per qualsiasi dato che
// arriva dall'esterno. Restituisce un messaggio di errore, oppure null se va tutto bene
function validateSearchArgs(args) {
  if (typeof args.query !== 'string' || args.query.trim() === '') {
    return 'Il parametro query deve essere un testo non vuoto'
  }

  // remote è facoltativo: se c'è, deve essere true o false
  if (args.remote !== undefined && typeof args.remote !== 'boolean') {
    return 'Il parametro remote deve essere true o false'
  }

  return null
}

module.exports = { searchCoursesTool, validateSearchArgs }
