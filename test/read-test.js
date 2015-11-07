
var pdex = require('../index.js');

pdex(null, './test/csv').then(function (pokedex) {
	pokedex.getPokemonByName('venusaur')
		.then(function (p) {
			console.log(p);
		}).done();
}).done();