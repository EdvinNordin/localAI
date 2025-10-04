<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Ollama } from 'ollama/browser'
import { marked } from 'marked'

const AImodel = ref('gemma3:4b')
const ollama = new Ollama({ host: 'http://192.168.68.105:11434' }) //http://localhost:11434
const input = ref('')

interface Message {
  text: string
  isUser: boolean
}
const history = ref<Message[]>([])

async function newResponse() {
  const prompt = input.value
  input.value = ''
  history.value.push({ text: prompt, isUser: true })
  scrollDown()

  const response = await ollama.chat({
    model: AImodel.value,
    messages: [{ role: 'user', content: prompt }],
    stream: true,
  })

  history.value.push({ text: '', isUser: false })
  const lastIndex = history.value.length - 1

  for await (const part of response) {
    const word = part.message.content as string

    history.value[lastIndex]!.text += word

    if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 5) scrollDown()
  }

  history.value[lastIndex]!.text = marked.parse(history.value[lastIndex]!.text) as string
  if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 5) scrollDown()
}

async function scrollDown() {
  await nextTick()
  window.scrollTo({
    top: document.documentElement.scrollHeight,
    behavior: 'smooth',
  })
}
</script>

<template>
  <div class="text-white mx-auto max-w-250">
    <div class="mx-2 mb-15">
      <div
        v-for="(response, i) in history"
        :key="i"
        class="flex m-2"
        :class="response.isUser ? 'justify-end' : 'justify-start'"
      >
        <div
          class="inline-block p-3 rounded-sm text-xl break-words max-w-200 text-black"
          :class="response.isUser ? 'bg-violet-300' : 'bg-violet-50'"
          v-html="response.text"
        ></div>
      </div>
    </div>

    <div
      class="flex flex-row fixed bottom-0 border-2 max-w-200 w-full left-0 right-0 mx-auto mb-1.5 rounded-md bg-slate-600"
    >
      <textarea
        v-model="input"
        @keyup.shift.enter="newResponse"
        placeholder="Press shift + enter to send your message"
        class="rounded-sm p-2 w-4/5 focus:outline-hidden h-11"
      >
      </textarea>

      <input class="w-1/5 bg-slate-500 p-2 text-center" v-model="AImodel" />
    </div>
  </div>
</template>

<style>
pre {
  background-color: var(--color-slate-500);
  color: white;
  padding: 10px;
  margin-bottom: 20px;
}
ul {
  margin-bottom: 20px;
  margin-left: 20px;
  list-style: disc;
}
ol {
  margin-bottom: 20px;
  margin-left: 30px;
  list-style: decimal-leading;
}
ol > li::marker {
  font-weight: bold;
}
p {
  margin-bottom: 10px;
}
li {
  padding-left: 0px;
}
</style>
