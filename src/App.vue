<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { Ollama } from 'ollama/browser'
import { marked } from 'marked'

//URL
const url = window.location.href
let host = ''
if (url.startsWith('http://localhost')) host = 'http://192.168.68.105:5173/ollama'
else host = url + 'ollama'

//OLLAMA SETTINGS
const ollama = new Ollama({ host: host }) //url + 'ollama'
const AImodel = ref()
const availableModels = ref<string[]>([])
ollama.list().then((result) => {
  availableModels.value = result.models.map((m: { name: string }) => m.name)
  AImodel.value = availableModels.value[0]
})

//REFs
const input = ref('')
const fullAIcontext = <{ role: string; content: string }[]>[]
const shownConversation = ref<{ role: string; content: string }[]>([])
const container = ref<HTMLElement | null>(null)
const RAG = ref(true)
fullAIcontext.push({
  role: 'system',
  content: `You are a helpful AI assistant and the current date and time is "${new Date()}". Use the provided summary of web searches if they are available and compare it to your own information to see if it more accurate.'`,
})
let isRunning = false

//LLM RESPONSE GENERATION
async function newResponse() {
  isRunning = true
  const prompt = input.value
  input.value = ''

  shownConversation.value.push({ role: 'user', content: prompt })

  let context = ''
  if (RAG.value) {
    const topTexts = await webSearch(prompt)
    if (topTexts !== '') context = '\n\n Web search summary and its relevance score: \n' + topTexts
  }

  fullAIcontext.push({ role: 'user', content: prompt + context })

  scrollDown()

  const response = await ollama.chat({
    model: AImodel.value,
    messages: fullAIcontext,
    stream: true,
  })

  //create a new history element
  shownConversation.value.push({ role: 'assistant', content: '' })
  const lastIndex = shownConversation.value.length - 1

  //stream the assitants message into the new history element
  for await (const part of response) {
    const word = part.message.content as string

    shownConversation.value[lastIndex]!.content += word

    if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
      scrollDown()
  }

  fullAIcontext.push({ role: 'assistant', content: shownConversation.value[lastIndex]!.content })
  //From text to html to show on screen
  shownConversation.value[lastIndex]!.content = marked.parse(
    shownConversation.value[lastIndex]!.content,
  ) as string
  if (container.value && window.innerHeight + window.scrollY >= container.value.scrollHeight - 5)
    scrollDown()

  isRunning = false
}

// WEBSEARCH FUNCTION
async function webSearch(prompt: string) {
  //First embed the prompt from the user
  /*   const promptEmbedding: EmbedResponse = await ollama.embed({
    model: AImodel.value,
    input: prompt,
  }) */

  //Create a google query
  const webSearch = await ollama.generate({
    model: AImodel.value,
    prompt: `
            Pretend you're an experienced Google user and convert the following message into a concise Google search query. The current date and time is "${new Date()}"
            Only return the search string, no explanations or extra text.
            Message: "${prompt}"
            `,
  })

  console.log('Google query: ', webSearch.response)

  //Pull the results from the web
  const webResults = await fetch('/langsearch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: webSearch.response }),
  }).then((r) => r.json())

  const stringy = JSON.stringify(webResults)

  console.log(stringy) /*
  //Create an array with page snippet or name from web results
  const webSummaries = webResults.map((page: any) => {
    return page.summary
  })

  console.log('web summaries length', webSummaries.length)
  const summarizedResults: string[] = []
  webSummaries.forEach(async (page: string) => {
    const generated = await ollama.generate({
      model: AImodel.value,
      prompt: `
            You are an assistant that summarizes web search results for use in semantic embedding and similarity comparison.

            Summarize the provided web result into one concise, information-rich sentence (no more than 30 words).
            Return ONLY a valid summary. Do not include explanations, extra text, or code fences. Again, no more than 30 words.

            Web result:
            ${page}`,
    })
    summarizedResults.push(generated.response as string)
  })
 */
  /*  //Embed the snippets or names of the webpages
  const webResultEmbedding: EmbedResponse = await ollama.embed({
    model: AImodel.value,
    input: summarizedResults,
  })

  //Check which is web result is most aligned to the prompt and order in descending order
  const similaritiyEmeddings = webResultEmbedding.embeddings
    .map((ebedding) => {
      const score = cosineSimilarity(ebedding, promptEmbedding.embeddings[0]!)
      return { ebedding, score }
    })
    .sort((a, b) => b.score - a.score)

  const topMatches = similaritiyEmeddings.slice(0, 3) // top 3

  console.log('Length of topMatches:', topMatches.length)
  //Create an array of the top three results and format to provide its name and snippet
  const topTexts = topMatches
    .map((m, i) => {
      const page = webResults.data.webPages.value[i]
      return `Result ${i + 1}: ${page.name}\n${page.url}\n${page.summary}`
    })
    .join('\n\n') */

  //console.log(summarizedResults)

  return stringy
}

function cosineSimilarity(vecA: number[], vecB: number[]) {
  const dot = vecA.reduce((sum, val, i) => sum + val * vecB[i]!, 0)
  const magA = Math.sqrt(vecA.reduce((sum, val) => sum + val * val, 0))
  const magB = Math.sqrt(vecB.reduce((sum, val) => sum + val * val, 0))
  return dot / (magA * magB)
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

function stopAllStreams() {
  ollama.abort()
}
</script>

<template>
  <div class="bg-gradient-to-b from-slate-950 to-slate-500 w-[100vw] h-[100vh]">
    <h1
      v-if="shownConversation.length === 0"
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
          v-for="(response, i) in shownConversation"
          :key="i"
          :class="response.role === 'user' ? 'justify-end' : 'justify-start'"
          class="flex m-2"
        >
          <div
            v-if="response.role !== 'system'"
            class="inline-block bg-gradient-to-b rounded-md text-xl break-words max-w-200 text-white"
            :class="
              response.role === 'user'
                ? 'from-blue-600 to-sky-400 justify-end'
                : 'from-violet-600 to-purple-400 justify-start'
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
        class="w-full max-w-200 fixed bottom-0 mb-1.5 mx-auto left-0 right-0 rounded-md bg-gradient-to-b from-blue-600 to-sky-400"
      >
        <div class="flex flex-row align-middle bg-slate-600 rounded-md m-0.5">
          <textarea
            v-model="input"
            @keyup.enter.exact="newResponse"
            placeholder="Ask your local AI anyting"
            autofocus
            class="rounded-l-md p-2 w-full focus:outline-hidden h-10 mr-0 resize-none"
          >
          </textarea>

          <div
            v-if="isRunning"
            @click="stopAllStreams"
            class="bg-slate-700 rounded-full cursor-pointer h-8 w-11 flex items-center justify-center my-auto mr-1"
          >
            <span class="text-white text-3xl font-[Segoe_UI_Symbol] leading-none select-none">
              &#x23F9;
            </span>
          </div>

          <div class="w-/5 bg-slate-800 rounded-r-md p-2 text-center ml-0 flex flex-row">
            <select v-model="AImodel">
              <option v-for="(model, i) in availableModels" :key="i">{{ model }}</option>
            </select>

            <input type="checkbox" v-model="RAG" class="ml-2" />
          </div>
        </div>
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
