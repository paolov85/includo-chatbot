<script setup>
defineProps({
  message: Object
})
</script>

<template>
  <div class="bubble" :class="'bubble-' + message.role">
    <p class="bubble-text">{{ message.content }}</p>
  </div>
</template>

<style scoped>
.bubble {
  max-width: 75%;
  margin-bottom: 10px;
  padding: 8px 12px;
  border-radius: 8px;
}

.bubble-assistant {
  background-color: #ffffff;
  border: 1px solid #e7e5e4;
}

.bubble-error {
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: #991b1b;
}

.bubble-user {
  margin-left: auto;
  background-color: #d1fae5;
}

.bubble-text {
  margin: 0;
  line-height: 1.4;
  /* Le risposte del chatbot vanno a capo: mantengo le righe come arrivano */
  white-space: pre-wrap;
}
</style>
