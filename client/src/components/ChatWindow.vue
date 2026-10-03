<script setup>
import { ref, watch, nextTick, onMounted } from 'vue'
import MessageBubble from './MessageBubble.vue'

const props = defineProps({
  messages: Array,
  isWaiting: Boolean
})

const emit = defineEmits(['send'])

const newMessage = ref('')
const messagesBox = ref(null)

// I messaggi più recenti stanno in fondo: dopo ogni cambiamento riporto lì la vista
function scrollToBottom() {
  nextTick(() => {
    if (messagesBox.value !== null) {
      messagesBox.value.scrollTop = messagesBox.value.scrollHeight
    }
  })
}

onMounted(scrollToBottom)
watch(() => props.messages.length, scrollToBottom)
watch(() => props.isWaiting, scrollToBottom)

function sendMessage() {
  const text = newMessage.value.trim()

  // Niente messaggi vuoti, e niente invii mentre aspetto la risposta precedente
  if (text === '' || props.isWaiting) {
    return
  }

  emit('send', text)
  newMessage.value = ''
}
</script>

<template>
  <div ref="messagesBox" class="messages">
    <MessageBubble v-for="(message, index) in messages" :key="index" :message="message" />

    <p v-if="isWaiting" class="typing">L'assistente sta scrivendo…</p>
  </div>

  <form class="composer" @submit.prevent="sendMessage">
    <input
      v-model="newMessage"
      class="composer-input"
      type="text"
      placeholder="Scrivi un messaggio"
      :disabled="isWaiting"
    />
    <button class="composer-button" type="submit" :disabled="isWaiting">Invia</button>
  </form>
</template>

<style scoped>
.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.typing {
  margin: 0;
  font-size: 14px;
  font-style: italic;
  color: #78716c;
}

.composer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #e7e5e4;
  background-color: #ffffff;
}

.composer-input {
  flex: 1;
  padding: 10px 12px;
  font-size: 15px;
  font-family: inherit;
  border: 1px solid #d6d3d1;
  border-radius: 20px;
}

.composer-button {
  padding: 10px 20px;
  font-size: 15px;
  font-weight: bold;
  color: #ffffff;
  background-color: #0d9488;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

.composer-button:hover {
  background-color: #0f766e;
}

.composer-button:disabled {
  background-color: #a8a29e;
  cursor: default;
}
</style>
