<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Ollama } from 'ollama/browser'
import { marked } from 'marked'

const url = window.location.href
let host = ''
if (url.startsWith('http://localhost')) host = 'http://192.168.68.105:5173/ollama'
else host = url

const ollama = new Ollama({ host: host }) //url + 'ollama'

const AImodel = ref()
const availableModels = ref<string[]>([])
ollama.list().then((result) => {
  availableModels.value = result.models.map((m: { name: string }) => m.name)
  AImodel.value = availableModels.value[0]
})
const input = ref('')

const history = ref<{ role: string; content: string }[]>([])

const container = ref<HTMLElement | null>(null)
async function newResponse() {
  const prompt = input.value

  input.value = ''
  history.value.push({ role: 'user', content: prompt })
  scrollDown()

  const response = await ollama.chat({
    model: AImodel.value,
    messages: history.value,
    stream: true,
  })

  const webSearch = await ollama.generate({
    model: AImodel.value,
    prompt: `
Pretend you're an experienced Google user and convert the following message into a concise Google search query.
Only return the search string, no explanations or extra text.
Message: "${prompt}"
`,
  })

  console.log(webSearch)

  const webResults = await fetch('/websearch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: webSearch.response }),
  }).then((r) => r.json())

  console.log(webResults)

  /*   const webResults = await ollama.webSearch({
    query: webSearch.response,
  })
  console.log(webResults) */

  console.log(webSearch)
  history.value.push({ role: 'system', content: '' })
  const lastIndex = history.value.length - 1

  for await (const part of response) {
    const word = part.message.content as string

    history.value[lastIndex]!.content += word

    if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
      scrollDown()
  }

  history.value[lastIndex]!.content = marked.parse(history.value[lastIndex]!.content) as string
  if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
    scrollDown()
}

async function scrollDown() {
  await nextTick()
  if (container.value) {
    container.value.scrollTo({
      top: container.value.scrollHeight,
      behavior: 'smooth',
    })
  }
}
</script>

<template>
  <div class="bg-gradient-to-b from-slate-950 to-slate-500 w-[100vw] h-[100vh]">
    <h1
      v-if="history.length === 0"
      class="fixed left-[50%] top-[40%] -translate-[50%] text-8xl bg-gradient-to-b from-blue-600 to-sky-400 bg-clip-text text-transparent"
    >
      localAI
    </h1>
    <div
      ref="container"
      class="text-white mx-auto max-w-7xl flex flex-col items-stretch overflow-y-auto h-screen"
    >
      <div class="mx-2 mb-15">
        <div
          v-for="(response, i) in history"
          :key="i"
          class="flex m-2"
          :class="response.role === 'user' ? 'justify-end' : 'justify-start'"
        >
          <div
            class="inline-block bg-gradient-to-b rounded-md text-xl break-words max-w-200 text-white"
            :class="
              response.role === 'user'
                ? 'from-blue-600 to-sky-400'
                : 'from-violet-600 to-purple-400'
            "
          >
            <div
              v-html="response.content"
              class="p-3 m-0.5 rounded-md bg-slate-700 backdrop-blur-md"
            ></div>
          </div>
        </div>
      </div>

      <div
        class="flex flex-row fixed bottom-0 max-w-200 w-full left-0 right-0 mx-auto mb-1.5 rounded-md bg-gradient-to-b from-blue-600 to-sky-400"
      >
        <textarea
          v-model="input"
          @keyup.enter.exact="newResponse"
          placeholder="Ask your local AI anyting"
          autofocus
          class="bg-slate-600 rounded-l-md p-2 w-full focus:outline-hidden h-10 m-0.5 mr-0 resize-none"
        >
        </textarea>

        <select v-model="AImodel" class="w-/5 bg-slate-800 rounded-r-md p-2 text-center m-0.5 ml-0">
          <option v-for="(model, i) in availableModels" :key="i">{{ model }}</option>
        </select>
      </div>
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
ol,
li::marker {
  font-weight: bold;
}
p {
  margin-bottom: 10px;
}
li {
  padding-left: 0px;
}
</style>
