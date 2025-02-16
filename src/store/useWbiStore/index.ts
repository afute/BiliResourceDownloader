import { defineStore } from 'pinia'
import useWbi from './hooks/useWbi'

export const useWbiStore = defineStore('bilibili_wbi', () => {
  const {
    state,
    data,
    errMsg,
    refreshWbi
  } = useWbi()

  return {
    state,
    data,
    errMsg,
    refreshWbi
  }
})
