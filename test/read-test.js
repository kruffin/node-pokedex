
var pdex = require('../src/index.js');

pdex().then(function (pokedex) {
	pokedex.getPokemonByName('venusaur')
		.then(function (p) {
			console.log(p);
		}).done();

	pokedex.getMoveByName('swords-dance')
		.then(function (m) {
			console.log(m);
		}).done();

	pokedex.getVersionGroupById(4)
		.then(function (vg) {
			console.log(vg);
		}).done();

	pokedex.getLatestVersionGroup()
		.then(function (vg) {
			console.log(vg);
		}).done();
}).done();