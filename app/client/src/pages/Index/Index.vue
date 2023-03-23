<template>
<q-page>
  <q-item class="flex-center">
    <q-item-label class="bigger q-ma-lg">
      Welcome {{ $store.username }} !
    </q-item-label>
  </q-item>
  <q-item class="flex-center">
    <q-btn color="orange" label="play matchmaking" @click="MatchMaking = true"/>
  </q-item>
  <div class="r-py-md q-px-md">
    <q-item>
      <q-item-label class="bigger">Spectate games</q-item-label>
    </q-item>

    <q-separator class="q-ma-md" color="blue-grey-3" />
    <q-item v-if="!$store.running_games.length">
      <q-item-label class="label">No game is currently running</q-item-label>
    </q-item>
    <div v-for="game in $store.running_games" :key="game.gameId">
      <SpectateGames :pOne=game.playerOneName :pTwo=game.playerTwoName :gameId=game.gameId :map=game.map />
    </div>
  </div>
  <q-dialog persistent v-model="MatchMaking">
		<ChooseGameOptions :opponent="'test'" :inviteType="true"/>
	</q-dialog>
</q-page>
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';
import SpectateGames from '../../components/SpectateGames.vue';
import ChooseGameOptions from '../../components/ChooseGameOptions.vue'

export default defineComponent({
	name: 'Index',
	components: { SpectateGames, ChooseGameOptions },
  setup () {
    const MatchMaking = ref(false)
    return {
      MatchMaking
    }
  },
	data() {
		return {
		}
	},
  mounted () {
    this.$ws.listen("already-in-matchmacking", () =>{
      console.log("aled")
      this.MatchMaking = false;
      this.$store.notifCenter.send({ type: 'warning', message: "your are already in matchmacking" })
    })
  },
  created () {

  },
  updated() {
  },
	methods: {
	},
});
</script>

<style lang="sass" scoped>

</style>

