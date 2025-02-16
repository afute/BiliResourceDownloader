<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { autoJump, canParseURL, resolveB23Link, resolveText } from "../utils/linkResolver.ts";

const inputText = ref('')
const processedInputText = computed<string>(() => {
  if (canParseURL(inputText.value)) {
    const url = new URL(inputText.value)
    if (url.protocol === 'http:') {
      url.protocol = 'https:'
    }
    if (url.pathname.endsWith('/')) {
      url.pathname = url.pathname.substring(0, url.pathname.length - 1)
    }
    return `${url.protocol}//${url.host}${url.pathname}${url.search}`
  }
  return inputText.value.trim()
})
const selectedSearchType = ref('auto')

const onChange = () => {
  const type = resolveText(processedInputText.value)
  if (type !== null) {
    selectedSearchType.value = type
  }
}

const jump = async () => {
  if (processedInputText.value === '') {
    ElMessage({
      message: '请输入要解析的内容！',
      type: 'error',
    })
    return
  }

  let input = processedInputText.value

  let type = selectedSearchType.value
  if (type === 'auto') {
    if (input.startsWith('https://b23.tv/')) {
      const link = await resolveB23Link(input)
      if (link === null) {
        ElMessage({
          message: '请输入正确的b23短链接！',
          type: 'error',
        })
        return
      }
      input = link
      inputText.value = link
    }

    const inferredType = resolveText(input)
    if (inferredType !== null) {
      selectedSearchType.value = inferredType
      type = inferredType
    } else {
      ElMessage({
        message: '无法自动推断出要解析的类型，请手动选择！',
        type: 'error',
      })
      return
    }
  }

  await autoJump(input, true, type)
}
</script>

<template>
  <div class="flex justify-center items-center w-full h-full">
    <ElInput
      v-model="inputText"
      placeholder="输入要解析的链接"
      autofocus
      clearable
      @input="onChange"
      @change="jump"
      class="max-w-screen-sm"
      autocomplete="on"
    >
      <template #prepend>
        <ElSelect
          v-model="selectedSearchType"
          class="!w-28"
          placeholder="选择搜索类型"
        >
          <ElOption
            label="自动推断"
            value="auto"
          />
          <ElOption
            label="直播间信息"
            value="liveroom"
          />
          <ElOption
            label="用户信息"
            value="user"
          />
          <ElOption
            label="动态"
            value="dynamic"
          />
          <ElOption
            label="视频"
            value="video"
          />
          <ElOption
            label="收藏集"
            value="lottery"
          />
          <ElOption
            label="装扮"
            value="suit"
          />
        </ElSelect>
      </template>
      <template #append>
        <ElButton
          :icon="Search"
          type="primary"
          @click="jump"
        />
      </template>
    </ElInput>
  </div>
</template>