<template>
<q-page>
  <q-item class="flex-center bg-grey-9">
    <q-item-label class="q-ma-lg press2p">
      Welcome {{ $store.username }} !
    </q-item-label>
  </q-item>
  <q-item class="flex-center" style="margin-top: 30px; gap: 2em;">
	<span>
		<div class="press2p" style="text-align: center; font-size: 10px;" >Launch a game</div>
		<div style="text-align: center;">
			<q-btn icon="mdi-gamepad-variant-outline" color="orange" flat label="play" @click="MatchMaking = true"/>
		</div>
	</span>
	<span>
		<div class="press2p" style="text-align: center; font-size: 10px;" >See Your Profile Page</div>
	<div style="text-align: center;">

	<q-btn icon="mdi-account-box-outline" color="green" flat label="profile" @click="goProfile"/>
	</div>
	</span>
	<span>
		<div>
			<div class="press2p" style="text-align: center; font-size: 10px;" >Create a new channel</div>
		</div>
		<div style="text-align: center;">
	<q-btn icon="mdi-playlist-plus" color="secondary" flat label="channel" @click="MatchMaking = true"/>

</div>
	</span>

  </q-item>
  <div class="r-py-md q-px-md">
    <q-separator class="q-ma-md" color="blue-grey-5" style="opacity: 50%;"/>
    <q-item v-if="!$store.running_games.length">
      <q-item-label class="absolute-center label press2p" style="font-size: 80%; opacity: 0.5;">No game is currently running</q-item-label>
    </q-item>
    <div class="absolute-center" v-for="game in $store.running_games" :key="game.gameId">
      <SpectateGames :pOne=game.playerOneName :pTwo=game.playerTwoName :gameId=game.gameId :map=game.map />
    </div>
  </div>
  <q-dialog persistent v-model="MatchMaking">
		<ChooseGameOptions :inviteType="true"/>
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
  methods: {
	goProfile() {
		      this.$router.push({
				path: `/profile/me`,
			});
	}
  },
	data() {
		return {
		}
	},
  mounted () {
    this.$ws.listen("already-in-matchmacking", () =>{
      this.MatchMaking = false;
      this.$store.notifCenter.send({ type: 'warning', message: "your are already in matchmacking" })
    })
  },
  created () {

  },
  updated() {
  },
});
</script>

<style lang="sass" scoped>
.centered
  display: flex
  justify-content: center

</style>

