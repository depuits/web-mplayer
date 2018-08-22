var timerId = undefined;
var socket = io.connect();

var compPlaylistItem = { 
	props: ['song', 'index'],
	template: '#playlistItemTemplate' 
};

var compSoundbit = {
	props: ['bit', 'indent'],
	name: 'soundbit',
	template: 
`<option v-if="typeof bit.value === 'string'" :value="bit.value" v-html="labelHtml"></option>
<optgroup v-else :label="label">
	<soundbit v-for="b in bit.value" :bit="b" :indent="indent + 1" :key="indent + b.name"></soundbit>
</optgroup>`,
	computed: {
		label: function() {
			return '    '.repeat(this.indent) + this.bit.name;
		},
		labelHtml: function() {
			return '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(this.indent) + this.bit.name;
		}
	}
}
var compSoundbits = {
	props: ['soundbits'],
	template: 
`<select v-model="soundbit" @change="soundbitChanged" class="custom-select js-soundbits">
	<option value="" disabled selected hidden>Play soundbit</option>
	<soundbit v-for="b in soundbits" :bit="b" :indent="0" :key="0 + b.name"></soundbit>
</select>`,
	data: function () {
		return {
			soundbit: ''
		}
	},
	methods: {
		soundbitChanged: function() {
			// play the selection value
			socket.emit('command', { cmd: 'playBit', file: this.soundbit });
			// reset the selection to default
			this.soundbit = '';
		}
	},
	components: {
		'soundbit': compSoundbit
	}
};

var compSearchResult = {
	props: ['song'],
	template: '#resultItemTemplate',
	methods: {
		request: function() {
			socket.emit('command', { cmd: 'request', id: this.song._id });	
		}
	}
};
var compSearch = {
	data: function () {
		return {
			search: '',
			result: []
		}
	},
	methods: {
		doSearch: function() {
			axios.get('find?s=' + this.search).then((resp) => this.result = resp.data);
		}
	},
	components: {
		'search-result': compSearchResult
	}
};

var app = new Vue({
	el: '.app',
	data: {
		connected: false,
		currentSong: null,
		requestlist: [],
		playlist: [],
		playing: false,
		volume: 100,
		time: 0,
		duration: 0,
		scanning: false,
		soundbits: [],
		votes: []
	},
	methods: {
		ctrlPlay: function() { 
			socket.emit('command', { cmd: 'togglePlay' });
		},
		ctrlNext: function() { 
			socket.emit('command', { cmd: 'next' });
		},
		ctrlVeto: function() { 
			socket.emit('command', { cmd: 'veto' });
		},
		ctrlScan: function() {
			socket.emit('command', { cmd: 'scan' });
		},
		ctrlVolume: function() {
			socket.emit('command', { cmd: 'volume', value: this.volume });
		}
	},
	components: {
		'playlist-item': compPlaylistItem,
		'soundbits': compSoundbits,
		'search': compSearch
	}
});

socket.on('disconnect', function() {
	app.connected = false;
	
	if(timerId !== undefined) {
		clearInterval(timerId);
		timerId = undefined;
	}
});
socket.on('playlist', function(data) {
	app.currentSong = data.current;
	
	app.requestlist = data.requestlist;
	app.playlist = data.playlist;
	
	document.title = 'MPlayer: ' + data.current.title;
	if(data.current.artist) {
		document.title += ' - ' + data.current.artist;
	}
});
socket.on('status', function(status) {
	app.connected = true;

	app.playing = status.playing;
	app.volume = status.volume;
	app.time = Math.round(status.time);
	app.duration = Math.round(status.duration);
	app.scanning = status.scanning;

	//start or stop the timer according to the play state
	if (app.playing && timerId === undefined) {
		timerId = setInterval(function() { ++app.time; }, 1000);
	} else if(!app.playing && timerId !== undefined) {
		clearInterval(timerId);
		timerId = undefined;
	}
});
socket.on('votes', function(votes) {
	app.votes = votes;
	updateVotesChart(votes);
});

var ctx = document.getElementById('votesChart').getContext('2d');
var votesChart = new Chart(ctx, {
	type: 'polarArea',
	data: {
		datasets: [{ 
			data: [0, 0, 0] ,
			backgroundColor: ['rgba(201,203,207,0.75)', 'rgba(255,99,132,0.75)', 'rgba(75,192,192,0.75)'],
			borderColor: ['rgba(255,255,255,0.25)', 'rgba(255,255,255,0.25)', 'rgba(255,255,255,0.25)']
		}],
		labels: [ 'No vote', 'Next', 'Veto' ]
	},
	options: { 
		layout: { padding: 8 },
		legend: { display: false },
		scale: { ticks: { stepSize: 1 } }
	}
});

function updateVotesChart(votes) {
	votesChart.options.scale.ticks.max = votes.all;

	var data = votesChart.data.datasets[0].data;
	data[0] = votes.all - (votes.next + votes.veto);
	data[1] = votes.next;
	data[2] = votes.veto;

	votesChart.update();
}

axios.get('soundbits').then((resp) => app.soundbits = resp.data);
