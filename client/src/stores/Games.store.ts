import { defineStore } from 'pinia';

export const useUserStore = defineStore('user', {
  state: () => {
    return {
      games: [] as GameInfo[],
    }
  },
  actions: {
    async list() {}}});


    interface GameInfo {
        id: number
    }